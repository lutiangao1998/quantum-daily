/**
 * Multi-provider LLM client for Quantum Daily.
 *
 * Priority order:
 *   1. DeepSeek  (cheapest — ~$0.14/M input tokens)
 *   2. OpenAI    (fallback if DeepSeek key missing)
 *   3. Manus     (last resort — uses platform credits)
 *
 * All providers expose the same OpenAI-compatible chat completion API,
 * so we use a single fetch-based implementation.
 */

export type LLMProvider = "deepseek" | "openai" | "manus";

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

/** Detect which provider to use based on available env keys */
export function getActiveProvider(): LLMProvider {
  if (process.env.DEEPSEEK_API_KEY) return "deepseek";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "manus";
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
  manus: { input: 0, output: 0, label: "Manus Built-in (credits)" },
};

/**
 * Call the active LLM provider with automatic fallback.
 * Tries DeepSeek → OpenAI → Manus in order.
 */
export async function callLLM(options: LLMOptions): Promise<LLMResult> {
  const providers: LLMProvider[] = [];

  if (process.env.DEEPSEEK_API_KEY) providers.push("deepseek");
  if (process.env.OPENAI_API_KEY) providers.push("openai");
  providers.push("manus"); // always available as fallback

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

/** Estimate cost for a completed LLM call (in USD) */
export function estimateCost(provider: LLMProvider, inputTokens: number, outputTokens: number): number {
  const costs = PROVIDER_COSTS[provider];
  return (inputTokens * costs.input + outputTokens * costs.output) / 1_000_000;
}
