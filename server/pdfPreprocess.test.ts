import { describe, expect, it } from "vitest";
import {
  cpfValido,
  cnpjValido,
  limparTextoProcesso,
  extrairCamposDeterministicos,
  selecionarTrechos,
  completarComCamposDeterministicos,
  prepararTextoParaIA,
} from "./_core/pdfPreprocess";

const CPF_OK = "529.982.247-25";
const CNPJ_OK = "60.746.948/0001-12";

describe("validação de documentos", () => {
  it("valida dígitos de CPF e CNPJ", () => {
    expect(cpfValido(CPF_OK)).toBe(true);
    expect(cpfValido("529.982.247-26")).toBe(false);
    expect(cpfValido("111.111.111-11")).toBe(false);
    expect(cnpjValido(CNPJ_OK)).toBe(true);
    expect(cnpjValido("60.746.948/0001-13")).toBe(false);
  });
});

describe("limparTextoProcesso", () => {
  it("remove assinaturas, numeração e cabeçalhos repetidos (mantendo a 1ª ocorrência)", () => {
    const pagina = (n: number) =>
      `TRIBUNAL DE JUSTIÇA DO ESTADO DE GOIÁS\nConteúdo da página ${n}\nAssinado eletronicamente por FULANO em 01/01/2025\nPágina ${n} de 3`;
    const limpo = limparTextoProcesso([1, 2, 3].map(pagina).join("\n"));
    expect(limpo.match(/TRIBUNAL DE JUSTIÇA/g)).toHaveLength(1);
    expect(limpo).not.toMatch(/Assinado eletronicamente/);
    expect(limpo).not.toMatch(/Página \d de 3/);
    expect(limpo).toContain("Conteúdo da página 3");
  });
});

describe("extrairCamposDeterministicos", () => {
  it("encontra CNJ (ordenado por frequência), CPFs/CNPJs válidos, CEP e OAB", () => {
    const texto = `Processo nº 5380169-54.2025.8.09.0051. Dependente do 0001234-56.2024.8.09.0051.
Autos 5380169-54.2025.8.09.0051. Autora: MARIA, CPF ${CPF_OK}, CEP 74.000-100.
Réu: BANCO X S.A., CNPJ ${CNPJ_OK}. CPF errado 123.456.789-00. Advogado OAB/GO 40.559`;
    const c = extrairCamposDeterministicos(texto);
    expect(c.numerosCnj).toEqual(["5380169-54.2025.8.09.0051", "0001234-56.2024.8.09.0051"]);
    expect(c.cpfs).toEqual([CPF_OK]);
    expect(c.cnpjs).toEqual([CNPJ_OK]);
    expect(c.ceps).toEqual(["74000-100"]);
    expect(c.oabs).toEqual(["OAB/GO 40.559"]);
  });
});

describe("selecionarTrechos", () => {
  it("mantém o texto inteiro quando cabe no limite", () => {
    expect(selecionarTrechos("abc", 10)).toBe("abc");
  });

  it("mantém início, a última decisão e o final quando excede o limite", () => {
    const texto = "INICIO " + "a".repeat(5000) + " SENTENÇA JULGO PROCEDENTE o pedido " + "b".repeat(5000) + " FIM";
    const r = selecionarTrechos(texto, 2000);
    expect(r.startsWith("INICIO")).toBe(true);
    expect(r).toContain("JULGO PROCEDENTE");
    expect(r.endsWith("FIM")).toBe(true);
    expect(r.length).toBeLessThan(2200);
  });
});

describe("completarComCamposDeterministicos", () => {
  const campos = extrairCamposDeterministicos(`Processo 5380169-54.2025.8.09.0051, CPF ${CPF_OK}`);

  it("preenche CNJ ausente e CPF ausente quando há um único CPF no documento", () => {
    const r = completarComCamposDeterministicos({ cliente: { cpfCnpj: null }, processo: { numeroCnj: null } }, campos);
    expect(r.processo.numeroCnj).toBe("5380169-54.2025.8.09.0051");
    expect(r.cliente.cpfCnpj).toBe(CPF_OK);
  });

  it("normaliza o CNJ e o CPF devolvidos pela IA", () => {
    const r = completarComCamposDeterministicos(
      { cliente: { cpfCnpj: "52998224725" }, processo: { numeroCnj: "53801695420258090051" } },
      campos
    );
    expect(r.processo.numeroCnj).toBe("5380169-54.2025.8.09.0051");
    expect(r.cliente.cpfCnpj).toBe(CPF_OK);
  });
});

describe("correção de percentuais", () => {
  it("converte 1500 em 15 e '30%' em 30, e descarta valores inválidos", () => {
    const campos = extrairCamposDeterministicos("");
    const r = completarComCamposDeterministicos(
      { sentenca: { honorariosPerc: 1500 }, financeiro: { margemConsignavelPerc: "30%" } },
      campos
    );
    expect(r.sentenca.honorariosPerc).toBe(15);
    expect(r.financeiro.margemConsignavelPerc).toBe(30);
    const r2 = completarComCamposDeterministicos({ sentenca: { honorariosPerc: "abc" } }, campos);
    expect(r2.sentenca.honorariosPerc).toBeNull();
    // valor em R$ no campo de percentual (honorários de R$ 5.255,80)
    const r3 = completarComCamposDeterministicos({ sentenca: { honorariosPerc: 5255.8 } }, campos);
    expect(r3.sentenca.honorariosPerc).toBeNull();
  });
});

describe("prepararTextoParaIA", () => {
  it("reduz o texto ao limite e extrai os campos do texto bruto completo", () => {
    const bruto = `Processo 5380169-54.2025.8.09.0051\n` + "x ".repeat(20000) + `\nCPF ${CPF_OK}`;
    const r = prepararTextoParaIA(bruto, 3000);
    expect(r.tamanhoFinal).toBeLessThanOrEqual(3100);
    expect(r.campos.cpfs).toEqual([CPF_OK]);
    expect(r.campos.numerosCnj[0]).toBe("5380169-54.2025.8.09.0051");
  });
});
