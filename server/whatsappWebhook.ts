// server/whatsappWebhook.ts
import { Router, type Request, type Response } from "express";
import { getDb } from "./db";
import { atendimentos, mensagens, clientes } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import {
  extrairTelefone,
  extrairTextoMensagem,
  extrairTipoMensagem,
  type EvolutionWebhookPayload,
} from "./whatsapp";

export const whatsappWebhookRouter = Router();

whatsappWebhookRouter.post("/webhook", async (req: Request, res: Response) => {
  // Respond 200 immediately — Evolution API needs fast ack
  res.status(200).json({ ok: true });

  const payload = req.body as EvolutionWebhookPayload;
  if (payload.event !== "messages.upsert") return;

  const data = payload.data;
  if (!data?.key || data.key.fromMe) return;

  const db = await getDb();
  if (!db) return;

  const telefone = extrairTelefone(data.key.remoteJid);
  const conteudo = extrairTextoMensagem(data);
  const tipo = extrairTipoMensagem(data);
  const evolutionMsgId = data.key.id;
  const nomeCliente = data.pushName ?? null;

  // Find open atendimento for this phone number
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
    // Try to find known client by phone
    const clienteRows = await db
      .select({ id: clientes.id })
      .from(clientes)
      .where(eq(clientes.telefone, telefone))
      .limit(1);

    const clienteId = clienteRows[0]?.id ?? null;

    const [result] = await db.insert(atendimentos).values({
      telefoneCliente: telefone,
      nomeCliente,
      clienteId,
      status: "aberto",
      canal: "whatsapp",
    });
    atendimentoId = Number((result as any).insertId);
  }

  // Deduplicate by evolutionMsgId
  if (evolutionMsgId) {
    const dupCheck = await db
      .select({ id: mensagens.id })
      .from(mensagens)
      .where(eq(mensagens.evolutionMsgId, evolutionMsgId))
      .limit(1);
    if (dupCheck.length > 0) return;
  }

  if (conteudo || tipo !== "texto") {
    await db.insert(mensagens).values({
      atendimentoId,
      origem: "cliente",
      tipo,
      conteudo: conteudo || `[${tipo}]`,
      evolutionMsgId: evolutionMsgId ?? null,
      lida: 0,
    });
  }
});
