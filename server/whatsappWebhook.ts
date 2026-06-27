// server/whatsappWebhook.ts
import { Router, type Request, type Response } from "express";
import mysql from "mysql2/promise";
import { getDb } from "./db";
import { atendimentos, mensagens, clientes } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import {
  extrairTextoMensagem,
  extrairTipoMensagem,
  type EvolutionWebhookPayload,
} from "./whatsapp";

export const whatsappWebhookRouter = Router();

// Lock para evitar race condition em chats.upsert duplicados
const processingJids = new Set<string>();

// Conexão direta ao DB do Evolution para buscar mensagens @lid
let evolutionDb: mysql.Connection | null = null;
async function getEvolutionDb(): Promise<mysql.Connection | null> {
  try {
    if (evolutionDb) {
      await evolutionDb.ping();
      return evolutionDb;
    }
    evolutionDb = await mysql.createConnection(
      process.env.EVOLUTION_DATABASE_URL ??
        "mysql://root:root@localhost:3306/evolution_api"
    );
    return evolutionDb;
  } catch {
    evolutionDb = null;
    return null;
  }
}

function extrairTelefoneJid(remoteJid: string): string {
  // @s.whatsapp.net → número
  if (remoteJid.includes("@s.whatsapp.net")) {
    return remoteJid.replace("@s.whatsapp.net", "");
  }
  // @lid → usa o id numérico como identificador (prefixado para distinguir)
  if (remoteJid.includes("@lid")) {
    return `lid:${remoteJid.replace("@lid", "")}`;
  }
  // grupos @g.us → ignorar
  return remoteJid.replace(/@.+$/, "");
}

async function processarMensagem(
  remoteJid: string,
  msgId: string,
  pushName: string | null,
  messageData: unknown,
  messageType: string
) {
  if (remoteJid.includes("@g.us")) return; // ignorar grupos

  const db = await getDb();
  if (!db) return;

  // Dedup por evolutionMsgId
  if (msgId) {
    const dup = await db
      .select({ id: mensagens.id })
      .from(mensagens)
      .where(eq(mensagens.evolutionMsgId, msgId))
      .limit(1);
    if (dup.length > 0) return;
  }

  const telefone = extrairTelefoneJid(remoteJid);
  const nomeCliente = pushName ?? null;

  // Texto e tipo da mensagem
  const msgObj = { message: messageData, messageType } as any;
  const conteudo = extrairTextoMensagem(msgObj);
  const tipo = extrairTipoMensagem(msgObj);

  if (!conteudo && tipo === "texto") return; // mensagem vazia

  // Buscar ou criar atendimento
  const existing = await db
    .select()
    .from(atendimentos)
    .where(eq(atendimentos.telefoneCliente, telefone))
    .orderBy(desc(atendimentos.createdAt))
    .limit(1);

  let atendimentoId: number;

  if (existing.length > 0 && existing[0].status !== "encerrado") {
    atendimentoId = existing[0].id;
    if (nomeCliente && !existing[0].nomeCliente) {
      await db
        .update(atendimentos)
        .set({ nomeCliente })
        .where(eq(atendimentos.id, atendimentoId));
    }
  } else {
    const clienteRows = await db
      .select({ id: clientes.id })
      .from(clientes)
      .where(eq(clientes.telefone, telefone))
      .limit(1);

    const [result] = await db.insert(atendimentos).values({
      telefoneCliente: telefone,
      nomeCliente,
      clienteId: clienteRows[0]?.id ?? null,
      status: "aberto",
      canal: "whatsapp",
    });
    atendimentoId = Number((result as { insertId: number }).insertId);
  }

  await db.insert(mensagens).values({
    atendimentoId,
    origem: "cliente",
    tipo,
    conteudo: conteudo || `[${tipo}]`,
    evolutionMsgId: msgId ?? null,
    lida: 0,
  });
}

whatsappWebhookRouter.post("/webhook", async (req: Request, res: Response) => {
  res.status(200).json({ ok: true });

  const payload = req.body as EvolutionWebhookPayload;
  const event = payload.event;

  // === messages.upsert — mensagem em tempo real (JIDs @s.whatsapp.net) ===
  if (event === "messages.upsert") {
    const rawData = (payload as any).data;
    const dataArr = Array.isArray(rawData) ? rawData : [rawData];
    for (const data of dataArr) {
      if (!data?.key || data.key.fromMe) continue;
      await processarMensagem(
        data.key.remoteJid,
        data.key.id,
        data.pushName ?? null,
        data.message,
        data.messageType ?? "conversation"
      ).catch(console.error);
    }
    return;
  }

  // === chats.upsert — chat atualizado (nova mensagem @lid) ===
  if (event === "chats.upsert") {
    const rawData = (payload as any).data;
    const chats = Array.isArray(rawData) ? rawData : [rawData];

    const eDb = await getEvolutionDb();
    if (!eDb) return;

    for (const chat of chats) {
      // chats.upsert pode ter id como CUID (DB interno) ou como JID
      let remoteJid: string = chat?.remoteJid ?? chat?.id ?? "";
      if (!remoteJid) continue;

      // Se é um CUID (não contém @), buscar remoteJid via tabela Chat
      if (!remoteJid.includes("@")) {
        try {
          const [chatRows] = await eDb.execute(
            "SELECT remoteJid FROM Chat WHERE id = ? LIMIT 1",
            [remoteJid]
          ) as [any[], any];
          if (chatRows?.length) {
            remoteJid = chatRows[0].remoteJid;
          } else {
            // Chat novo ainda não salvo na tabela — buscar mensagem mais recente (últimos 60s)
            const cutoff = Math.floor(Date.now() / 1000) - 60;
            const [recentRows] = await eDb.execute(
              `SELECT JSON_UNQUOTE(JSON_EXTRACT(\`key\`, '$.remoteJid')) as jid
               FROM Message
               WHERE JSON_VALUE(\`key\`, '$.fromMe') = 'false'
                 AND messageTimestamp >= ?
               ORDER BY messageTimestamp DESC LIMIT 1`,
              [cutoff]
            ) as [any[], any];
            if (!recentRows?.length) continue;
            remoteJid = recentRows[0].jid;
          }
        } catch { continue; }
      }

      if (remoteJid.includes("@g.us")) continue;
      if (processingJids.has(remoteJid)) continue;
      processingJids.add(remoteJid);

      try {
        // Buscar a última mensagem recebida deste chat no DB Evolution
        const [rows] = await eDb.execute(
          `SELECT id, \`key\`, message, messageType, pushName, messageTimestamp
           FROM Message
           WHERE JSON_UNQUOTE(JSON_EXTRACT(\`key\`, '$.remoteJid')) = ?
             AND JSON_VALUE(\`key\`, '$.fromMe') = 'false'
           ORDER BY messageTimestamp DESC LIMIT 1`,
          [remoteJid]
        ) as [any[], any];

        if (!rows?.length) continue;

        const row = rows[0];
        const key = typeof row.key === "string" ? JSON.parse(row.key) : row.key;
        const message = typeof row.message === "string" ? JSON.parse(row.message) : row.message;

        // remoteJidAlt tem o número real quando remoteJid é @lid
        const jidReal = key.remoteJidAlt ?? remoteJid;

        await processarMensagem(
          jidReal,
          key.id,
          row.pushName,
          message,
          row.messageType ?? "conversation"
        ).catch(console.error);
      } catch (e) {
        console.error("[WhatsApp webhook] chats.upsert error:", e);
      } finally {
        processingJids.delete(remoteJid);
      }
    }
    return;
  }
});
