// Pré-processamento do texto extraído de PDFs de processos antes de enviar à IA:
// limpa ruído (cabeçalhos, assinaturas), extrai campos de formato fixo via regex
// e seleciona os trechos mais relevantes quando o texto passa do limite do modelo.

import { ENV } from "./env";

export type CamposDeterministicos = {
  numerosCnj: string[]; // ordenados por frequência (o mais citado primeiro)
  cpfs: string[];
  cnpjs: string[];
  ceps: string[];
  oabs: string[];
};

export type TextoPreparado = {
  texto: string;
  campos: CamposDeterministicos;
  tamanhoOriginal: number;
  tamanhoFinal: number;
};

const RUIDO_LINHA = [
  /assinado (eletronicamente|digitalmente)/i,
  /documento assinado/i,
  /c[óo]digo (de )?(valida[çc][ãa]o|verificador)/i,
  /valide (este|o) documento|para validar|autenticidade/i,
  /^\s*p[áa]g(ina)?\.?\s*\d+\s*(de|\/)\s*\d+\s*$/i,
  /^\s*https?:\/\/\S+\s*$/i,
  /^--\s*\d+\s+of\s+\d+\s*--$/i, // marcador de página do pdf-parse
  /^\s*\d+\s*$/,
];

export function limparTextoProcesso(texto: string): string {
  const linhas = texto
    .replace(/\r/g, "")
    .replace(/[ \t ]+/g, " ")
    .split("\n")
    .map(l => l.trim());

  // Linhas curtas que se repetem em várias páginas são cabeçalho/rodapé
  const contagem = new Map<string, number>();
  for (const l of linhas) {
    if (l && l.length < 160) contagem.set(l, (contagem.get(l) ?? 0) + 1);
  }
  const vistas = new Set<string>();

  const resultado: string[] = [];
  for (const l of linhas) {
    if (!l) {
      if (resultado.length && resultado[resultado.length - 1] !== "") resultado.push("");
      continue;
    }
    if (RUIDO_LINHA.some(r => r.test(l))) continue;
    if ((contagem.get(l) ?? 0) >= 3) {
      // mantém a primeira ocorrência (pode conter o nº do processo ou o nome do tribunal)
      if (vistas.has(l)) continue;
      vistas.add(l);
    }
    resultado.push(l);
  }
  return resultado.join("\n").trim();
}

const soDigitos = (s: string) => s.replace(/\D/g, "");

export function cpfValido(cpf: string): boolean {
  const d = soDigitos(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (len: number) => {
    let soma = 0;
    for (let i = 0; i < len; i++) soma += Number(d[i]) * (len + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

export function cnpjValido(cnpj: string): boolean {
  const d = soDigitos(cnpj);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (len: number) => {
    const pesos = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = pesos.reduce((acc, p, i) => acc + Number(d[i]) * p, 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}

const formatarCpf = (d: string) => `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
const formatarCnpj = (d: string) => `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;

const REGEX_CNJ = /\b(\d{7})-?(\d{2})\.?(\d{4})\.?(\d)\.?(\d{2})\.?(\d{4})\b/g;
export const CNJ_FORMATADO = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;

export function extrairCamposDeterministicos(texto: string): CamposDeterministicos {
  const freqCnj = new Map<string, number>();
  for (const m of Array.from(texto.matchAll(REGEX_CNJ))) {
    const cnj = `${m[1]}-${m[2]}.${m[3]}.${m[4]}.${m[5]}.${m[6]}`;
    freqCnj.set(cnj, (freqCnj.get(cnj) ?? 0) + 1);
  }
  const numerosCnj = Array.from(freqCnj.entries()).sort((a, b) => b[1] - a[1]).map(([c]) => c);

  const unicos = (xs: string[]) => Array.from(new Set(xs));
  const cpfs = unicos(
    Array.from(texto.matchAll(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g), m => soDigitos(m[0]))
      .filter(cpfValido)
      .map(formatarCpf)
  );
  const cnpjs = unicos(
    Array.from(texto.matchAll(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g), m => soDigitos(m[0]))
      .filter(cnpjValido)
      .map(formatarCnpj)
  );
  const ceps = unicos(Array.from(texto.matchAll(/\bCEP:?\s*(\d{2}\.?\d{3}-?\d{3})\b/gi), m => {
    const d = soDigitos(m[1]);
    return `${d.slice(0, 5)}-${d.slice(5)}`;
  }));
  const oabs = unicos(Array.from(texto.matchAll(/\bOAB\s*[\/\-]?\s*([A-Z]{2})\s*(?:n[º°o.]*\s*)?([\d.]{3,8})/gi),
    m => `OAB/${m[1].toUpperCase()} ${m[2]}`));

  return { numerosCnj, cpfs, cnpjs, ceps, oabs };
}

const MARCADORES_DECISAO = /\b(SENTEN[ÇC]A|DISPOSITIVO|ANTE O EXPOSTO|DIANTE DO EXPOSTO|JULGO\s+(PARCIALMENTE\s+)?(PROCEDENTE|IMPROCEDENTE)|AC[ÓO]RD[ÃA]O|DECIS[ÃA]O)\b/gi;

// Quando o texto excede o limite, mantém início (qualificação/pedidos), a última decisão e o final (movimentações recentes)
export function selecionarTrechos(texto: string, maxChars: number): string {
  if (texto.length <= maxChars) return texto;
  const separador = "\n\n[... trecho omitido ...]\n\n";

  let ultimaDecisao = -1;
  for (const m of Array.from(texto.matchAll(MARCADORES_DECISAO))) ultimaDecisao = m.index ?? ultimaDecisao;

  const tamInicio = Math.floor(maxChars * 0.5);
  const tamDecisao = ultimaDecisao > tamInicio ? Math.floor(maxChars * 0.3) : 0;
  const tamFim = maxChars - tamInicio - tamDecisao;

  const inicio = texto.slice(0, tamInicio);
  const fimStart = Math.max(texto.length - tamFim, tamInicio);
  const partes = [inicio];
  if (tamDecisao) {
    const decStart = Math.max(ultimaDecisao - 500, tamInicio);
    const decEnd = Math.min(decStart + tamDecisao, fimStart);
    if (decEnd > decStart) partes.push(texto.slice(decStart, decEnd));
  }
  partes.push(texto.slice(fimStart));
  return partes.join(separador);
}

export function limiteCaracteresIA(): number {
  const env = Number(process.env.LLM_MAX_INPUT_CHARS);
  if (env > 0) return env;
  // Modelos locais (CPU) ficam lentos com textos grandes
  return ENV.llmProvider === "ollama" ? 12000 : 50000;
}

export function prepararTextoParaIA(textoBruto: string, maxChars = limiteCaracteresIA()): TextoPreparado {
  const campos = extrairCamposDeterministicos(textoBruto);
  const limpo = limparTextoProcesso(textoBruto);
  const texto = selecionarTrechos(limpo, maxChars);
  return { texto, campos, tamanhoOriginal: textoBruto.length, tamanhoFinal: texto.length };
}

// Bloco para o prompt: dados encontrados por regex, que a IA deve usar e apenas atribuir às partes
export function blocoCamposDeterministicos(campos: CamposDeterministicos): string {
  const linhas = [
    campos.numerosCnj.length && `- Números CNJ (mais citado primeiro): ${campos.numerosCnj.slice(0, 5).join(", ")}`,
    campos.cpfs.length && `- CPFs válidos: ${campos.cpfs.slice(0, 10).join(", ")}`,
    campos.cnpjs.length && `- CNPJs válidos: ${campos.cnpjs.slice(0, 10).join(", ")}`,
    campos.ceps.length && `- CEPs: ${campos.ceps.slice(0, 5).join(", ")}`,
    campos.oabs.length && `- OABs: ${campos.oabs.slice(0, 10).join(", ")}`,
  ].filter(Boolean);
  if (!linhas.length) return "";
  return `DADOS JÁ IDENTIFICADOS AUTOMATICAMENTE NO DOCUMENTO (use-os; apenas atribua cada um à parte correta):\n${linhas.join("\n")}\n\n`;
}

// Corrige/complementa o JSON da IA com os campos de formato fixo
export function completarComCamposDeterministicos(dados: any, campos: CamposDeterministicos): any {
  if (!dados || typeof dados !== "object") return dados;
  dados.processo ??= {};
  dados.cliente ??= {};

  const cnjIA = typeof dados.processo.numeroCnj === "string" ? dados.processo.numeroCnj.trim() : "";
  const cnjIANormalizado = cnjIA && extrairCamposDeterministicos(cnjIA).numerosCnj[0];
  if (cnjIANormalizado) {
    dados.processo.numeroCnj = cnjIANormalizado;
  } else if (campos.numerosCnj.length) {
    dados.processo.numeroCnj = campos.numerosCnj[0];
  }

  const doc = typeof dados.cliente.cpfCnpj === "string" ? soDigitos(dados.cliente.cpfCnpj) : "";
  if (doc.length === 11 && cpfValido(doc)) {
    dados.cliente.cpfCnpj = formatarCpf(doc);
  } else if (doc.length === 14 && cnpjValido(doc)) {
    dados.cliente.cpfCnpj = formatarCnpj(doc);
  } else if (campos.cpfs.length === 1) {
    // CPF ausente/inválido e só um CPF no documento: é o do cliente
    dados.cliente.cpfCnpj = campos.cpfs[0];
  }

  if (!dados.cliente.cep && campos.ceps.length === 1) dados.cliente.cep = campos.ceps[0];

  // Percentuais fora de 0–100 (ex.: 1500 para 15%) estouram a coluna decimal(5,2)
  const corrigirPercentual = (obj: any, campo: string) => {
    if (!obj || obj[campo] == null || obj[campo] === "") return;
    let v = typeof obj[campo] === "number" ? obj[campo] : parseFloat(String(obj[campo]).replace("%", "").replace(",", "."));
    if (!Number.isFinite(v) || v < 0) { obj[campo] = null; return; }
    // 1500 -> 15 (percentual multiplicado por 100); outros valores > 100 são um valor em R$ no campo errado
    if (v > 100) v = v % 100 === 0 && v / 100 <= 100 ? v / 100 : NaN;
    obj[campo] = Number.isFinite(v) ? Math.round(v * 100) / 100 : null;
  };
  corrigirPercentual(dados.sentenca, "honorariosPerc");
  corrigirPercentual(dados.financeiro, "margemConsignavelPerc");
  return dados;
}

// A análise profunda é uma 2ª chamada longa à IA; com modelo local ela dobraria o tempo do upload
export function analiseProfundaHabilitada(): boolean {
  const env = process.env.LLM_ANALISE_PROFUNDA;
  if (env) return env === "1";
  return ENV.llmProvider !== "ollama";
}
