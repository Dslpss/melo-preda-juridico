// server/whatsapp.ts

const BASE_URL = process.env.EVOLUTION_API_URL ?? "";
const API_KEY = process.env.EVOLUTION_API_KEY ?? "";
const INSTANCE = process.env.EVOLUTION_INSTANCE ?? "melo-preda";

async function evolutionRequest(path: string, body: unknown): Promise<boolean> {
  if (!BASE_URL || !API_KEY) return false;
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: API_KEY },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function enviarMensagemTexto(
  telefone: string,
  texto: string
): Promise<boolean> {
  const number = telefone.replace(/\D/g, "");
  return evolutionRequest(`/message/sendText/${INSTANCE}`, {
    number,
    text: texto,
  });
}

export function extrairTelefone(remoteJid: string): string {
  return remoteJid.replace("@s.whatsapp.net", "").replace("@g.us", "");
}

export function extrairTextoMensagem(data: EvolutionMessageData): string {
  const msg = data.message ?? {};
  return (
    (msg.conversation as string | undefined) ??
    ((msg.extendedTextMessage as { text?: string } | undefined)?.text) ??
    ((msg.imageMessage as { caption?: string } | undefined)?.caption) ??
    ((msg.videoMessage as { caption?: string } | undefined)?.caption) ??
    ""
  );
}

export function extrairTipoMensagem(
  data: EvolutionMessageData
): "texto" | "audio" | "imagem" | "documento" | "video" {
  const type = data.messageType ?? "";
  if (type === "audioMessage" || type === "pttMessage") return "audio";
  if (type === "imageMessage") return "imagem";
  if (type === "videoMessage") return "video";
  if (type === "documentMessage") return "documento";
  return "texto";
}

export interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: EvolutionMessageData;
}

export interface EvolutionMessageData {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message?: Record<string, unknown>;
  messageType?: string;
  pushName?: string;
  messageTimestamp?: number;
}
