/**
 * Multi-provider LLM client for Quantum Daily.
 *
 * Priority order:
 *   1. DeepSeek  (cheapest — ~$0.14/M input tokens)
 *   2. OpenAI
 *   3. Claude
 *   4. Gemini
 *   5. Manus     (last resort — uses platform credits)
 *
 * Supports auto mode and manual provider selection via runtime config.
 */

import { getRuntimeConfig } from "./runtimeConfig";

export type LLMProvider = "deepseek" | "openai" | "claude" | "gemini" | "manus";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMOptions {
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json";
}

export interface LLMResult {
  content: string;
  provider: LLMProvider;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}

/** Provider config map */
const PROVIDER_CONFIG: Record<
  LLMProvider,
  { baseUrl: string; model: string; getKey: () => string }
> = {
  deepseek: {
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    getKey: () => process.env.DEEPSEEK_API_KEY ?? "",
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    getKey: () => process.env.OPENAI_API_KEY ?? "",
  },
  claude: {
    baseUrl: "https://api.anthropic.com/v1",
    model: "claude-3-5-haiku-latest",
    getKey: () => process.env.CLAUDE_API_KEY ?? "",
  },
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.5-flash",
    getKey: () => process.env.GEMINI_API_KEY ?? "",
  },
  manus: {
    baseUrl: process.env.BUILT_IN_FORGE_API_URL ?? "https://api.manus.im/v1",
    model: "default",
    getKey: () => process.env.BUILT_IN_FORGE_API_KEY ?? "",
  },
};

/** Cost estimates per 1M tokens (USD) */
export const PROVIDER_COSTS: Record<LLMProvider, { input: number; output: number; label: string }> = {
  deepseek: { input: 0.14, output: 0.28, label: "DeepSeek Chat" },
  openai: { input: 0.15, output: 0.60, label: "GPT-4o Mini" },
  claude: { input: 0.80, output: 4.00, label: "Claude 3.5 Haiku" },
  gemini: { input: 0.10, output: 0.40, label: "Gemini 2.5 Flash" },
  manus: { input: 0, output: 0, label: "Manus Built-in (credits)" },
};

function hasProviderKey(provider: LLMProvider): boolean {
  if (provider === "manus") return true;
  return !!PROVIDER_CONFIG[provider].getKey();
}

export function getPreferredProviderMode():
  | "auto"
  | "deepseek"
  | "openai"
  | "claude"
  | "gemini"
  | "manus" {
  return getRuntimeConfig().llmProvider;
}

function getProviderOrder(): LLMProvider[] {
  const preferred = getPreferredProviderMode();

  if (preferred !== "auto") {
    if (preferred === "manus") return ["manus"];
    return [preferred, "manus"];
  }

  const providers: LLMProvider[] = [];
  if (hasProviderKey("deepseek")) providers.push("deepseek");
  if (hasProviderKey("openai")) providers.push("openai");
  if (hasProviderKey("claude")) providers.push("claude");
  if (hasProviderKey("gemini")) providers.push("gemini");
  providers.push("manus");
  return providers;
}

/** Detect which provider is currently expected to run first */
export function getActiveProvider(): LLMProvider {
  const preferred = getPreferredProviderMode();
  if (preferred !== "auto") {
    if (preferred === "manus") return "manus";
    return hasProviderKey(preferred) ? preferred : "manus";
  }

  if (hasProviderKey("deepseek")) return "deepseek";
  if (hasProviderKey("openai")) return "openai";
  if (hasProviderKey("claude")) return "claude";
  if (hasProviderKey("gemini")) return "gemini";
  return "manus";
}

/**
 * Call the active LLM provider with automatic fallback.
 * In auto mode: DeepSeek → OpenAI → Claude → Gemini → Manus.
 * In manual mode: selected provider → Manus fallback.
 */
export async function callLLM(options: LLMOptions): Promise<LLMResult> {
  const providers = getProviderOrder();

  let lastError: Error | null = null;

  for (const provider of providers) {
    try {
      const result = await callProvider(provider, options);
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[LLM] Provider ${provider} failed: ${lastError.message}, trying next...`);
    }
  }

  throw lastError ?? new Error("All LLM providers failed");
}

/** Call a specific provider */
async function callProvider(provider: LLMProvider, options: LLMOptions): Promise<LLMResult> {
  if (provider === "claude") {
    return callClaudeProvider(options);
  }

  const config = PROVIDER_CONFIG[provider];
  const apiKey = config.getKey();

  if (!apiKey && provider !== "manus") {
    throw new Error(`No API key for provider: ${provider}`);
  }

  const body: Record<string, unknown> = {
    model: config.model,
    messages: options.messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens ?? 2000,
  };

  if (options.responseFormat === "json") {
    body.response_format = { type: "json_object" };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000), // 60s timeout
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "unknown error");
    throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 200)}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    model?: string;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`Empty response from ${provider}`);
  }

  return {
    content,
    provider,
    model: data.model ?? config.model,
    inputTokens: data.usage?.prompt_tokens,
    outputTokens: data.usage?.completion_tokens,
  };
}

async function callClaudeProvider(options: LLMOptions): Promise<LLMResult> {
  const config = PROVIDER_CONFIG.claude;
  const apiKey = config.getKey();

  if (!apiKey) {
    throw new Error("No API key for provider: claude");
  }

  const systemPrompt = options.messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");

  const messages = options.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

  const response = await fetch(`${config.baseUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: options.maxTokens ?? 2000,
      temperature: options.temperature ?? 0.3,
      system: systemPrompt || undefined,
      messages,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "unknown error");
    throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
    model?: string;
  };

  const content = data.content?.find((c) => c.type === "text")?.text;
  if (!content) {
    throw new Error("Empty response from claude");
  }

  return {
    content,
    provider: "claude",
    model: data.model ?? config.model,
    inputTokens: data.usage?.input_tokens,
    outputTokens: data.usage?.output_tokens,
  };
}

/** Estimate cost for a completed LLM call (in USD) */
export function estimateCost(provider: LLMProvider, inputTokens: number, outputTokens: number): number {
  const costs = PROVIDER_COSTS[provider];
  return (inputTokens * costs.input + outputTokens * costs.output) / 1_000_000;
}
