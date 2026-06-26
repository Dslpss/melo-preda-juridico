import { describe, it, expect } from "vitest";
import { getDb } from "./db";
import { atendimentos, mensagens } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  extrairTelefone,
  extrairTextoMensagem,
  extrairTipoMensagem,
  type EvolutionMessageData,
} from "./whatsapp";

describe("atendimentos table", () => {
  it("should insert and retrieve an atendimento", async () => {
    const db = await getDb();
    if (!db) return;
    try {
      await db.insert(atendimentos).values({
        telefoneCliente: "5562999999999",
        nomeCliente: "Teste Cliente",
        status: "aberto",
        canal: "whatsapp",
      });
      const rows = await db.select().from(atendimentos)
        .where(eq(atendimentos.telefoneCliente, "5562999999999"));
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0].status).toBe("aberto");
    } finally {
      await db.delete(atendimentos)
        .where(eq(atendimentos.telefoneCliente, "5562999999999"));
    }
  });
});

describe("mensagens table", () => {
  it("should be queryable", async () => {
    const db = await getDb();
    if (!db) return;
    const rows = await db.select().from(mensagens).limit(1);
    expect(Array.isArray(rows)).toBe(true);
  });
});

describe("extrairTelefone", () => {
  it("strips @s.whatsapp.net suffix", () => {
    expect(extrairTelefone("5562999999999@s.whatsapp.net")).toBe("5562999999999");
  });
  it("strips @g.us suffix", () => {
    expect(extrairTelefone("123456789@g.us")).toBe("123456789");
  });
  it("returns number unchanged if no suffix", () => {
    expect(extrairTelefone("5562999999999")).toBe("5562999999999");
  });
});

describe("extrairTextoMensagem", () => {
  it("extracts conversation text", () => {
    const data: EvolutionMessageData = {
      key: { remoteJid: "5562@s.whatsapp.net", fromMe: false, id: "x" },
      message: { conversation: "Olá" },
      messageType: "conversation",
    };
    expect(extrairTextoMensagem(data)).toBe("Olá");
  });
  it("returns empty string for audio (no text)", () => {
    const data: EvolutionMessageData = {
      key: { remoteJid: "5562@s.whatsapp.net", fromMe: false, id: "x" },
      message: {},
      messageType: "audioMessage",
    };
    expect(extrairTextoMensagem(data)).toBe("");
  });
  it("extracts extended text message", () => {
    const data: EvolutionMessageData = {
      key: { remoteJid: "5562@s.whatsapp.net", fromMe: false, id: "x" },
      message: { extendedTextMessage: { text: "Texto longo" } },
      messageType: "extendedTextMessage",
    };
    expect(extrairTextoMensagem(data)).toBe("Texto longo");
  });
});

describe("extrairTipoMensagem", () => {
  it("maps audioMessage to audio", () => {
    const data: EvolutionMessageData = {
      key: { remoteJid: "", fromMe: false, id: "" },
      messageType: "audioMessage",
    };
    expect(extrairTipoMensagem(data)).toBe("audio");
  });
  it("maps pttMessage to audio", () => {
    const data: EvolutionMessageData = {
      key: { remoteJid: "", fromMe: false, id: "" },
      messageType: "pttMessage",
    };
    expect(extrairTipoMensagem(data)).toBe("audio");
  });
  it("maps imageMessage to imagem", () => {
    const data: EvolutionMessageData = {
      key: { remoteJid: "", fromMe: false, id: "" },
      messageType: "imageMessage",
    };
    expect(extrairTipoMensagem(data)).toBe("imagem");
  });
  it("defaults conversation to texto", () => {
    const data: EvolutionMessageData = {
      key: { remoteJid: "", fromMe: false, id: "" },
      messageType: "conversation",
    };
    expect(extrairTipoMensagem(data)).toBe("texto");
  });
});
