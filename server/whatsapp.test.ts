import { describe, it, expect } from "vitest";
import { getDb } from "./db";
import { atendimentos, mensagens } from "../drizzle/schema";
import { eq } from "drizzle-orm";

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
