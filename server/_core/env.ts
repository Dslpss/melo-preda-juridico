export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  // "ollama" usa um modelo local; vazio = Gemini (se GEMINI_API_KEY) ou Forge
  llmProvider: (process.env.LLM_PROVIDER ?? "").toLowerCase(),
  llmModel: process.env.LLM_MODEL ?? "",
  ollamaUrl: process.env.OLLAMA_URL ?? "http://localhost:11434",
  ollamaNumCtx: Number(process.env.OLLAMA_NUM_CTX) || 16384,
  datajudApiKey: process.env.DATAJUD_API_KEY ?? "",
  jusconsigApiKey: process.env.JUSCONSIG_API_KEY ?? "",
};
