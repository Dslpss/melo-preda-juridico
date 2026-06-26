import { describe, it, expect } from "vitest";
import { getDb } from "./db";
import { filiais, setores } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("filiais table", () => {
  it("should insert and retrieve a filial", async () => {
    const db = await getDb();
    if (!db) return;
    try {
      await db.insert(filiais).values({
        nome: "Polo Goiânia",
        cidade: "Goiânia",
        estado: "GO",
        ativo: 1,
      });
      const rows = await db.select().from(filiais).where(eq(filiais.nome, "Polo Goiânia"));
      expect(rows.length).toBeGreaterThan(0);
    } finally {
      await db.delete(filiais).where(eq(filiais.nome, "Polo Goiânia"));
    }
  });
});

describe("setores table", () => {
  it("should insert and retrieve a setor", async () => {
    const db = await getDb();
    if (!db) return;
    try {
      await db.insert(setores).values({
        nome: "Financeiro",
        descricao: "Setor financeiro",
        ativo: 1,
      });
      const rows = await db.select().from(setores).where(eq(setores.nome, "Financeiro"));
      expect(rows.length).toBeGreaterThan(0);
    } finally {
      await db.delete(setores).where(eq(setores.nome, "Financeiro"));
    }
  });
});
