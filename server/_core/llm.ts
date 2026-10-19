import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message & { tool_calls?: ToolCall[] }) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    const result: Record<string, unknown> = {
      role,
      name,
      content: contentParts[0].text,
    };
    // Pass through tool_calls for assistant messages
    if ((message as any).tool_calls) {
      result.tool_calls = (message as any).tool_calls;
    }
    return result;
  }

  const result: Record<string, unknown> = {
    role,
    name,
    content: contentParts,
  };
  if ((message as any).tool_calls) {
    result.tool_calls = (message as any).tool_calls;
  }
  return result;
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

const useOllama = () => ENV.llmProvider === "ollama";

const useGeminiNative = () => !useOllama() && !!ENV.geminiApiKey;

const resolveApiUrl = () => {
  if (useGeminiNative()) {
    return "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
  }
  return ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://forge.manus.im/v1/chat/completions";
};

const resolveApiKey = () => useGeminiNative() ? ENV.geminiApiKey : ENV.forgeApiKey;

const assertApiKey = () => {
  if (!resolveApiKey()) {
    throw new Error("Nenhuma chave de IA configurada. Defina GEMINI_API_KEY ou OPENAI_API_KEY no .env");
  }
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

// Ollama via API nativa (/api/chat): permite definir num_ctx — o endpoint compatível com OpenAI
// usa o contexto padrão (pequeno) e cortaria o texto do processo sem avisar
const ollamaContentToText = (content: MessageContent | MessageContent[]) =>
  ensureArray(content)
    .map(part => {
      if (typeof part === "string") return part;
      if (part.type === "text") return part.text;
      if (part.type === "file_url") {
        throw new Error("O modelo local (Ollama) não lê arquivos anexados; envie o texto extraído do documento.");
      }
      return "";
    })
    .join("\n");

async function invokeOllama(params: InvokeParams): Promise<InvokeResult> {
  const model = ENV.llmModel || "qwen2.5:3b";
  const messages = params.messages.map(m => {
    const msg: Record<string, unknown> = {
      role: m.role === "function" ? "tool" : m.role,
      content: ollamaContentToText(m.content),
    };
    const toolCalls = (m as any).tool_calls as ToolCall[] | undefined;
    if (toolCalls?.length) {
      msg.tool_calls = toolCalls.map(tc => {
        let args: unknown = tc.function.arguments;
        try { args = JSON.parse(tc.function.arguments); } catch {}
        return { function: { name: tc.function.name, arguments: args } };
      });
    }
    return msg;
  });

  const format = normalizeResponseFormat(params);
  // Na CPU a geração sai a ~5-9 tokens/s: limita o tamanho para não passar do timeout da tela.
  // Respostas JSON (extração de PDF) precisam de mais espaço para não sair cortadas.
  const maxTokens = params.maxTokens ?? params.max_tokens ?? (Number(process.env.OLLAMA_MAX_TOKENS) || (format ? 3072 : 1024));
  const payload: Record<string, unknown> = {
    model,
    messages,
    stream: true,
    options: {
      num_ctx: ENV.ollamaNumCtx,
      num_predict: maxTokens,
      temperature: 0.1,
      repeat_penalty: 1.15, // modelos pequenos tendem a entrar em loop repetindo trechos
    },
  };
  if (format?.type === "json_object") payload.format = "json";
  if (format?.type === "json_schema") payload.format = format.json_schema.schema;
  if (params.tools?.length) payload.tools = params.tools;

  // stream=true: sem isso o fetch do Node aborta após 5 min esperando o cabeçalho da resposta
  const response = await fetch(`${ENV.ollamaUrl.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok || !response.body) {
    throw new Error(`Ollama invoke failed: ${response.status} ${response.statusText} – ${await response.text()}`);
  }

  let content = "";
  let toolCalls: ToolCall[] = [];
  let promptTokens = 0;
  let completionTokens = 0;
  let doneReason: string | null = null;
  const decoder = new TextDecoder();
  let buffer = "";
  const handleLine = (line: string) => {
    if (!line.trim()) return;
    const chunk = JSON.parse(line);
    if (chunk.error) throw new Error(`Ollama: ${chunk.error}`);
    content += chunk.message?.content ?? "";
    if (chunk.message?.tool_calls?.length) {
      toolCalls = toolCalls.concat(
        chunk.message.tool_calls.map((tc: any, i: number) => ({
          id: `call_${Date.now()}_${toolCalls.length + i}`,
          type: "function" as const,
          function: {
            name: tc.function.name,
            arguments: typeof tc.function.arguments === "string" ? tc.function.arguments : JSON.stringify(tc.function.arguments ?? {}),
          },
        }))
      );
    }
    if (chunk.done) {
      promptTokens = chunk.prompt_eval_count ?? 0;
      completionTokens = chunk.eval_count ?? 0;
      doneReason = chunk.done_reason ?? "stop";
    }
  };
  for await (const part of response.body as any as AsyncIterable<Uint8Array>) {
    buffer += decoder.decode(part, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    lines.forEach(handleLine);
  }
  handleLine(buffer);

  if (promptTokens >= ENV.ollamaNumCtx) {
    console.warn(`[Ollama] Prompt (${promptTokens} tokens) atingiu o limite de contexto (${ENV.ollamaNumCtx}); o texto pode ter sido cortado.`);
  }

  return {
    id: `ollama-${Date.now()}`,
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{
      index: 0,
      message: { role: "assistant", content, ...(toolCalls.length ? { tool_calls: toolCalls } : {}) },
      finish_reason: toolCalls.length ? "tool_calls" : doneReason,
    }],
    usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens },
  };
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  if (useOllama()) return invokeOllama(params);

  assertApiKey();

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
  } = params;

  const payload: Record<string, unknown> = {
    model: ENV.llmModel || "gemini-2.5-flash",
    messages: messages.map(normalizeMessage),
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  payload.max_tokens = 32768;
  // thinking só funciona no proxy Forge — Gemini nativo não suporta
  if (!useGeminiNative() && (!tools || tools.length === 0)) {
    payload.thinking = {
      budget_tokens: 1024
    };
  }

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  const response = await fetch(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${resolveApiKey()}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 429) {
      throw new Error(
        "O assistente de IA está temporariamente indisponível. Por favor, entre em contato com o suporte técnico de TI."
      );
    }
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  return (await response.json()) as InvokeResult;
}
