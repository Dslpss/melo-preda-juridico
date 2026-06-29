import { Router, type Request, type Response } from "express";
import mysql from "mysql2/promise";
import { getDb } from "./db";
import { atendimentos, mensagens, clientes } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import {
  extrairTextoMensagem,
  extrairTipoMensagem,
  extrairMediaUrl,
  type EvolutionWebhookPayload,
} from "./whatsapp";

export const whatsappWebhookRouter = Router();

// Lock para evitar race condition
const processingJids = new Set<string>();
const processingMsgIds = new Set<string>();

// Conexão direta ao DB do Evolution
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
  if (remoteJid.includes("@s.whatsapp.net")) {
    return remoteJid.replace("@s.whatsapp.net", "");
  }
  if (remoteJid.includes("@lid")) {
    return `lid:${remoteJid.replace("@lid", "")}`;
  }
  return remoteJid.replace(/@.+$/, "");
}

async function processarMensagem(
  remoteJid: string,
  msgId: string,
  pushName: string | null,
  messageData: unknown,
  messageType: string
) {
  if (remoteJid.includes("@g.us")) return;

  const db = await getDb();
  if (!db) return;

  // Dedup por evolutionMsgId
  if (msgId) {
    if (processingMsgIds.has(msgId)) return;
    processingMsgIds.add(msgId);
    setTimeout(() => processingMsgIds.delete(msgId), 30_000);

    const dup = await db
      .select({ id: mensagens.id })
      .from(mensagens)
      .where(eq(mensagens.evolutionMsgId, msgId))
      .limit(1);
    if (dup.length > 0) return;
  }

  const telefone = extrairTelefoneJid(remoteJid);
  const nomeCliente = pushName ?? null;

  const msgObj = { message: messageData, messageType } as any;
  const conteudo = extrairTextoMensagem(msgObj);
  const tipo = extrairTipoMensagem(msgObj);
  const mediaUrl = extrairMediaUrl(msgObj);

  if (!conteudo && tipo === "texto") return;

  const existing = await db
    .select()
    .from(atendimentos)
    .where(eq(atendimentos.telefoneCliente, telefone))
    .orderBy(desc(atendimentos.createdAt))
    .limit(1);

  let atendimentoId: number;

  if (existing.length > 0) {
    atendimentoId = existing[0].id;
    const updates: Record<string, unknown> = {};
    if (existing[0].status === "encerrado") updates.status = "aberto";
    if (nomeCliente && !existing[0].nomeCliente) updates.nomeCliente = nomeCliente;
    if (Object.keys(updates).length > 0) {
      await db.update(atendimentos).set(updates).where(eq(atendimentos.id, atendimentoId));
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
    mediaUrl: mediaUrl ?? null,
    evolutionMsgId: msgId ?? null,
    lida: 0,
  });

  console.log(`[WhatsApp] mensagem processada: ${telefone} → atendimento ${atendimentoId}`);
}

// ============================================================
// Polling: Evolution não dispara webhook para @lid JIDs.
// A cada 5s, busca mensagens novas no DB do Evolution.
// ============================================================
// 5min atrás — pega mensagens recebidas durante restart sem reprocessar histórico
let lastPolledTimestamp = Math.floor(Date.now() / 1000) - 300;

async function pollEvolutionMessages() {
  const eDb = await getEvolutionDb();
  if (!eDb) return;

  try {
    const [rows] = await eDb.execute(
      `SELECT id, \`key\`, message, messageType, pushName, messageTimestamp
       FROM Message
       WHERE JSON_VALUE(\`key\`, '$.fromMe') = 'false'
         AND messageTimestamp > ?
       ORDER BY messageTimestamp ASC`,
      [lastPolledTimestamp]
    ) as [any[], any];

    if (!rows?.length) return;

    lastPolledTimestamp = rows[rows.length - 1].messageTimestamp;

    // Agrupar por JID — processar todas msgs, mas sequencialmente por JID
    // para evitar race condition no INSERT de atendimento
    const byJid = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = typeof row.key === "string" ? JSON.parse(row.key) : row.key;
      const remoteJid: string = key.remoteJid ?? "";
      if (!remoteJid || remoteJid.includes("@g.us")) continue;
      const jidReal: string = key.remoteJidAlt ?? remoteJid;
      const bucket = byJid.get(jidReal) ?? [];
      bucket.push({ row, key });
      byJid.set(jidReal, bucket);
    }

    // Processar cada JID sequencialmente (evita duplicar atendimento)
    for (const [jidReal, entries] of byJid) {
      for (const { row, key } of entries) {
        const message = typeof row.message === "string" ? JSON.parse(row.message) : row.message;
        await processarMensagem(
          jidReal,
          key.id,
          row.pushName ?? null,
          message,
          row.messageType ?? "conversation"
        ).catch(console.error);
      }
    }
  } catch (e) {
    console.error("[WhatsApp poll] erro:", e);
  }
}

// Iniciar polling ao carregar o módulo
setInterval(pollEvolutionMessages, 5_000);
console.log("[WhatsApp] polling Evolution DB ativo (5s)");

// ============================================================
// Webhook HTTP (fallback para @s.whatsapp.net que funciona)
// ============================================================
whatsappWebhookRouter.post("/webhook", async (req: Request, res: Response) => {
  res.status(200).json({ ok: true });

  const payload = req.body as EvolutionWebhookPayload;
  const event = payload.event;

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

  if (event === "chats.upsert") {
    const rawData = (payload as any).data;
    const chats = Array.isArray(rawData) ? rawData : [rawData];

    const eDb = await getEvolutionDb();
    if (!eDb) return;

    for (const chat of chats) {
      let remoteJid: string = chat?.remoteJid ?? chat?.id ?? "";
      if (!remoteJid) continue;

      if (!remoteJid.includes("@")) {
        try {
          const [chatRows] = await eDb.execute(
            "SELECT remoteJid FROM Chat WHERE id = ? LIMIT 1",
            [remoteJid]
          ) as [any[], any];
          if (chatRows?.length) {
            remoteJid = chatRows[0].remoteJid;
          } else {
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
        const [rows] = await eDb.execute(
          `SELECT id, \`key\`, message, messageType, pushName
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
