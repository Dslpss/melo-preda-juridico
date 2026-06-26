import { getDb } from "./db";
import { prazosProcessuais, clientes } from "../drizzle/schema";
import { eq, and, gte } from "drizzle-orm";
import { enviarMensagemTexto } from "./whatsapp";

export type LembreteIntervalo = "7d" | "3d" | "1d";

export function calcularIntervaloPendente(
  diasRestantes: number,
  lembrete7dEnviado: boolean,
  lembrete3dEnviado: boolean,
  lembrete1dEnviado: boolean
): LembreteIntervalo | null {
  if (diasRestantes <= 0) return null;
  if (diasRestantes <= 1 && !lembrete1dEnviado) return "1d";
  if (diasRestantes <= 3 && !lembrete3dEnviado) return "3d";
  if (diasRestantes <= 7 && !lembrete7dEnviado) return "7d";
  return null;
}

function montarMensagem(nomeCompleto: string | null, dataFormatada: string): string {
  const primeiroNome = nomeCompleto?.split(" ")[0] ?? null;
  const saudacao = primeiroNome ? `Olá ${primeiroNome}! ` : "Olá! ";
  return (
    saudacao +
    `Lembrando que sua perícia está marcada para o dia ${dataFormatada}. ` +
    `Não esqueça de comparecer com seus documentos de identificação e laudos médicos. ` +
    `Qualquer dúvida, estamos à disposição.`
  );
}

export async function verificarEEnviarLembretes(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const agora = new Date();

  const pericias = await db
    .select()
    .from(prazosProcessuais)
    .where(
      and(
        eq(prazosProcessuais.tipo, "pericia"),
        eq(prazosProcessuais.status, "pendente"),
        gte(prazosProcessuais.dataVencimento, agora)
      )
    );

  for (const prazo of pericias) {
    const dataPericia = new Date(prazo.dataVencimento);
    const msRestantes = dataPericia.getTime() - agora.getTime();
    const diasRestantes = Math.ceil(msRestantes / (1000 * 60 * 60 * 24));

    const intervalo = calcularIntervaloPendente(
      diasRestantes,
      Boolean(prazo.lembrete7dEnviado),
      Boolean(prazo.lembrete3dEnviado),
      Boolean(prazo.lembrete1dEnviado)
    );

    if (!intervalo) continue;

    const clienteRows = await db
      .select({ telefone: clientes.telefone, nomeCompleto: clientes.nomeCompleto })
      .from(clientes)
      .where(eq(clientes.id, prazo.clienteId))
      .limit(1);

    const cliente = clienteRows[0];
    if (!cliente?.telefone) continue;

    const dataFormatada = dataPericia.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const mensagem = montarMensagem(cliente.nomeCompleto, dataFormatada);

    try {
      await enviarMensagemTexto(cliente.telefone, mensagem);
    } catch (e) {
      console.error(`[Lembretes] Falha ao enviar para prazo ${prazo.id}:`, e);
      continue;
    }

    const update: Record<string, number> = {};
    if (intervalo === "7d") update.lembrete7dEnviado = 1;
    if (intervalo === "3d") update.lembrete3dEnviado = 1;
    if (intervalo === "1d") update.lembrete1dEnviado = 1;

    await db
      .update(prazosProcessuais)
      .set(update)
      .where(eq(prazosProcessuais.id, prazo.id));

    console.log(`[Lembretes] Lembrete ${intervalo} enviado — prazo ${prazo.id}`);
  }
}
