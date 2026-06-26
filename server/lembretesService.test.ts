import { describe, it, expect } from "vitest";
import { calcularIntervaloPendente } from "./lembretesService";

describe("calcularIntervaloPendente", () => {
  it("retorna '7d' quando faltam 7 dias e nenhum lembrete enviado", () => {
    expect(calcularIntervaloPendente(7, false, false, false)).toBe("7d");
  });

  it("retorna '7d' quando faltam 5 dias e nenhum lembrete enviado", () => {
    expect(calcularIntervaloPendente(5, false, false, false)).toBe("7d");
  });

  it("retorna '3d' quando faltam 3 dias e lembrete7d já enviado", () => {
    expect(calcularIntervaloPendente(3, true, false, false)).toBe("3d");
  });

  it("retorna '3d' quando faltam 2 dias, 7d enviado, 3d não enviado", () => {
    expect(calcularIntervaloPendente(2, true, false, false)).toBe("3d");
  });

  it("retorna '1d' quando falta 1 dia e lembretes 7d e 3d já enviados", () => {
    expect(calcularIntervaloPendente(1, true, true, false)).toBe("1d");
  });

  it("retorna null quando todos os lembretes já foram enviados", () => {
    expect(calcularIntervaloPendente(1, true, true, true)).toBeNull();
  });

  it("retorna null quando faltam mais de 7 dias", () => {
    expect(calcularIntervaloPendente(10, false, false, false)).toBeNull();
  });

  it("retorna null quando prazo já passou (0 dias)", () => {
    expect(calcularIntervaloPendente(0, false, false, false)).toBeNull();
  });

  it("retorna null quando prazo negativo", () => {
    expect(calcularIntervaloPendente(-1, false, false, false)).toBeNull();
  });
});
