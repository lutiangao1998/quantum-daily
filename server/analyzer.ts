import { callLLM, getActiveProvider, estimateCost } from "./llmClient";
import type { RawArticle } from "./crawler";

export type QuantumCategory =
  | "quantum_computing"
  | "quantum_communication"
  | "quantum_sensing"
  | "quantum_cryptography"
  | "general";

export interface AnalyzedArticle extends RawArticle {
  titleZh: string;
  summaryEn: string;
  summaryZh: string;
  category: QuantumCategory;
  importanceScore: number;
}

export interface ReportSummary {
  summaryEn: string;
  summaryZh: string;
  titleEn: string;
  titleZh: string;
}

/** Track total cost for a pipeline run */
let _runCostUSD = 0;
export function getRunCost(): number { return _runCostUSD; }
export function resetRunCost(): void { _runCostUSD = 0; }

const CATEGORY_DESCRIPTIONS: Record<QuantumCategory, string> = {
  quantum_computing:
    "Quantum computing hardware, algorithms, error correction, qubit technologies",
  quantum_communication:
    "Quantum networks, quantum internet, quantum teleportation, entanglement distribution",
  quantum_sensing:
    "Quantum sensors, quantum metrology, atomic clocks, gravitational sensors",
  quantum_cryptography:
    "Quantum key distribution (QKD), post-quantum cryptography, quantum security",
  general: "General quantum physics, policy, investment, or multi-topic",
};

/** Analyze a batch of articles with AI (uses DeepSeek > OpenAI > Manus) */
export async function analyzeArticles(
  rawArticles: RawArticle[]
): Promise<AnalyzedArticle[]> {
  resetRunCost();
  const provider = getActiveProvider();
  console.log(`[Analyzer] Using LLM provider: ${provider}`);

  const results: AnalyzedArticle[] = [];

  // Process in batches of 5 to avoid token limits
  const BATCH_SIZE = 5;
  for (let i = 0; i < rawArticles.length; i += BATCH_SIZE) {
    const batch = rawArticles.slice(i, i + BATCH_SIZE);
    console.log(`[Analyzer] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(rawArticles.length / BATCH_SIZE)} (${batch.length} articles)...`);
    const batchResults = await analyzeBatch(batch);
    results.push(...batchResults);
    // Small delay between batches to respect rate limits
    if (i + BATCH_SIZE < rawArticles.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  console.log(`[Analyzer] Done. Total estimated cost: $${_runCostUSD.toFixed(4)} USD`);
  return results;
}

async function analyzeBatch(
  articles: RawArticle[]
): Promise<AnalyzedArticle[]> {
  const articlesJson = articles.map((a, idx) => ({
    index: idx,
    title: a.title,
    source: a.source,
    content: (a.rawContent || "").slice(0, 600),
    authors: a.authors || "",
  }));

  const prompt = `You are an expert quantum technology analyst. Analyze the following ${articles.length} articles about quantum technology.

For each article, provide:
1. titleZh: Chinese translation of the title
2. summaryEn: 2-3 sentence English summary (concise, technical, informative)
3. summaryZh: 2-3 sentence Chinese summary (same content as summaryEn but in Chinese)
4. category: one of: quantum_computing | quantum_communication | quantum_sensing | quantum_cryptography | general
   - quantum_computing: ${CATEGORY_DESCRIPTIONS.quantum_computing}
   - quantum_communication: ${CATEGORY_DESCRIPTIONS.quantum_communication}
   - quantum_sensing: ${CATEGORY_DESCRIPTIONS.quantum_sensing}
   - quantum_cryptography: ${CATEGORY_DESCRIPTIONS.quantum_cryptography}
   - general: ${CATEGORY_DESCRIPTIONS.general}
5. importanceScore: 0.0-10.0 (10=breakthrough/major news, 7-9=significant, 4-6=moderate, 1-3=minor)

Articles:
${JSON.stringify(articlesJson, null, 2)}

Respond with a JSON object: {"results": [...]} where each item has: index, titleZh, summaryEn, summaryZh, category, importanceScore`;

  try {
    const result = await callLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a quantum technology expert analyst. Always respond with valid JSON only, no markdown code blocks.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      maxTokens: 3000,
      responseFormat: "json",
    });

    // Track cost
    if (result.inputTokens && result.outputTokens) {
      _runCostUSD += estimateCost(result.provider, result.inputTokens, result.outputTokens);
    }

    // Parse response — strip markdown code fences if present
    let jsonStr = result.content.trim();
    jsonStr = jsonStr.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");

    const parsed = JSON.parse(jsonStr) as {
      results: Array<{
        index: number;
        titleZh: string;
        summaryEn: string;
        summaryZh: string;
        category: QuantumCategory;
        importanceScore: number;
      }>;
    };

    return articles.map((article, idx) => {
      const analysis = parsed.results?.find((r) => r.index === idx);
      return {
        ...article,
        titleZh: analysis?.titleZh || article.title,
        summaryEn: analysis?.summaryEn || "Summary not available.",
        summaryZh: analysis?.summaryZh || "摘要暂不可用。",
        category: (analysis?.category as QuantumCategory) || "general",
        importanceScore: analysis?.importanceScore ?? 5.0,
      };
    });
  } catch (e) {
    console.error("[Analyzer] Batch analysis error:", e);
    // Return with defaults on error
    return articles.map((article) => ({
      ...article,
      titleZh: article.title,
      summaryEn: article.rawContent?.slice(0, 200) || "Summary not available.",
      summaryZh: "摘要暂不可用。",
      category: "general" as QuantumCategory,
      importanceScore: 5.0,
    }));
  }
}

/** Generate executive summary for the entire daily report */
export async function generateReportSummary(
  articles: AnalyzedArticle[],
  reportDate: string
): Promise<ReportSummary> {
  const topArticles = [...articles]
    .sort((a, b) => b.importanceScore - a.importanceScore)
    .slice(0, 10);

  const articleSummaries = topArticles
    .map(
      (a, i) =>
        `${i + 1}. [${a.category}] ${a.title} (Score: ${a.importanceScore})\n   ${a.summaryEn}`
    )
    .join("\n\n");

  const categoryCounts = articles.reduce(
    (acc, a) => {
      acc[a.category] = (acc[a.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  try {
    const result = await callLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a quantum technology intelligence analyst writing executive briefings. Respond with valid JSON only, no markdown.",
        },
        {
          role: "user",
          content: `Write an executive summary for the Quantum Daily Intelligence Report for ${reportDate}.

Total articles: ${articles.length}
Category breakdown: ${JSON.stringify(categoryCounts)}

Top articles:
${articleSummaries}

Respond with JSON: {"titleEn": "...", "titleZh": "...", "summaryEn": "3-4 paragraphs...", "summaryZh": "3-4 paragraphs in Chinese..."}`,
        },
      ],
      temperature: 0.4,
      maxTokens: 2000,
      responseFormat: "json",
    });

    // Track cost
    if (result.inputTokens && result.outputTokens) {
      _runCostUSD += estimateCost(result.provider, result.inputTokens, result.outputTokens);
    }

    let jsonStr = result.content.trim();
    jsonStr = jsonStr.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");

    return JSON.parse(jsonStr) as ReportSummary;
  } catch (e) {
    console.error("[Analyzer] Report summary error:", e);
    return {
      titleEn: `Quantum Daily Intelligence Report — ${reportDate}`,
      titleZh: `量子科技每日情报报告 — ${reportDate}`,
      summaryEn: `Today's report covers ${articles.length} articles across quantum computing, communication, sensing, and cryptography.`,
      summaryZh: `今日报告涵盖量子计算、量子通信、量子传感和量子密码学领域共 ${articles.length} 篇文章。`,
    };
  }
}
