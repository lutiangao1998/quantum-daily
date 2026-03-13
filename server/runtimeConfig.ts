import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type LLMProviderMode =
  | "auto"
  | "deepseek"
  | "openai"
  | "claude"
  | "gemini"
  | "manus";

export type SourceKey =
  | "arxiv"
  | "googleNews"
  | "hackerNews"
  | "mitTechReview"
  | "ieee"
  | "physorg";

export type SourceConfig = Record<SourceKey, boolean>;

export interface RuntimeConfig {
  llmProvider: LLMProviderMode;
  sources: SourceConfig;
  updatedAt: string;
}

export const SOURCE_LABELS: Record<SourceKey, string> = {
  arxiv: "arXiv",
  googleNews: "Google News",
  hackerNews: "Hacker News",
  mitTechReview: "MIT Technology Review",
  ieee: "IEEE Spectrum",
  physorg: "Phys.org",
};

export const DEFAULT_SOURCE_CONFIG: SourceConfig = {
  arxiv: true,
  googleNews: true,
  hackerNews: true,
  mitTechReview: true,
  ieee: true,
  physorg: true,
};

const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  llmProvider: "auto",
  sources: DEFAULT_SOURCE_CONFIG,
  updatedAt: new Date().toISOString(),
};

const CONFIG_PATH = path.resolve(process.cwd(), "data", "runtime-config.json");
let _cachedConfig: RuntimeConfig | null = null;

function normalizeSourceConfig(input: unknown): SourceConfig {
  const sourceObj =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};

  return {
    arxiv: sourceObj.arxiv !== false,
    googleNews: sourceObj.googleNews !== false,
    hackerNews: sourceObj.hackerNews !== false,
    mitTechReview: sourceObj.mitTechReview !== false,
    ieee: sourceObj.ieee !== false,
    physorg: sourceObj.physorg !== false,
  };
}

function normalizeRuntimeConfig(input: unknown): RuntimeConfig {
  const obj =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};

  const provider = obj.llmProvider;
  const llmProvider: LLMProviderMode =
    provider === "deepseek" ||
    provider === "openai" ||
    provider === "claude" ||
    provider === "gemini" ||
    provider === "manus" ||
    provider === "auto"
      ? provider
      : "auto";

  return {
    llmProvider,
    sources: normalizeSourceConfig(obj.sources),
    updatedAt:
      typeof obj.updatedAt === "string" && obj.updatedAt
        ? obj.updatedAt
        : new Date().toISOString(),
  };
}

function saveRuntimeConfig(config: RuntimeConfig): void {
  const dir = path.dirname(CONFIG_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export function getRuntimeConfig(): RuntimeConfig {
  if (_cachedConfig) return _cachedConfig;

  try {
    if (!existsSync(CONFIG_PATH)) {
      _cachedConfig = { ...DEFAULT_RUNTIME_CONFIG, sources: { ...DEFAULT_SOURCE_CONFIG } };
      saveRuntimeConfig(_cachedConfig);
      return _cachedConfig;
    }

    const raw = readFileSync(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    _cachedConfig = normalizeRuntimeConfig(parsed);
    return _cachedConfig;
  } catch (error) {
    console.warn("[RuntimeConfig] Failed to load config, using defaults:", error);
    _cachedConfig = { ...DEFAULT_RUNTIME_CONFIG, sources: { ...DEFAULT_SOURCE_CONFIG } };
    return _cachedConfig;
  }
}

export function updateRuntimeConfig(input: {
  llmProvider?: LLMProviderMode;
  sources?: Partial<SourceConfig>;
}): RuntimeConfig {
  const current = getRuntimeConfig();

  const next: RuntimeConfig = {
    ...current,
    llmProvider: input.llmProvider ?? current.llmProvider,
    sources: {
      ...current.sources,
      ...(input.sources ?? {}),
    },
    updatedAt: new Date().toISOString(),
  };

  _cachedConfig = normalizeRuntimeConfig(next);
  saveRuntimeConfig(_cachedConfig);
  return _cachedConfig;
}
