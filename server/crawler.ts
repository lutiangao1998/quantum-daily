import RSSParser from "rss-parser";
import axios from "axios";
import * as cheerio from "cheerio";
import { getRuntimeConfig, type SourceKey } from "./runtimeConfig";

export interface RawArticle {
  title: string;
  url: string;
  source: string;
  publishedAt?: Date;
  rawContent?: string;
  authors?: string;
}

const rssParser = new RSSParser({
  timeout: 15000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; QuantumDailyBot/1.0; +https://quantum-daily.manus.space)",
  },
});

const QUANTUM_KEYWORDS = [
  "quantum computing",
  "quantum communication",
  "quantum sensing",
  "quantum cryptography",
  "quantum computer",
  "quantum processor",
  "qubit",
  "quantum entanglement",
  "quantum supremacy",
  "quantum advantage",
  "quantum network",
  "quantum internet",
  "quantum key distribution",
  "QKD",
  "quantum error correction",
  "quantum algorithm",
  "quantum hardware",
  "photonic quantum",
  "topological qubit",
  "quantum annealing",
];

function isQuantumRelated(text: string): boolean {
  const lower = text.toLowerCase();
  return QUANTUM_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
}

/** arXiv quant-ph feed — research papers */
async function crawlArXiv(): Promise<RawArticle[]> {
  try {
    const feed = await rssParser.parseURL(
      "https://rss.arxiv.org/rss/quant-ph"
    );
    const articles: RawArticle[] = [];
    for (const item of (feed.items || []).slice(0, 30)) {
      if (!item.title || !item.link) continue;
      articles.push({
        title: item.title.replace(/\n/g, " ").trim(),
        url: item.link,
        source: "arXiv",
        publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
        rawContent: item.contentSnippet || item.content || "",
        authors: item.creator || "",
      });
    }
    return articles;
  } catch (e) {
    console.error("[Crawler] arXiv error:", e);
    return [];
  }
}

/** Google News RSS for quantum topics */
async function crawlGoogleNews(): Promise<RawArticle[]> {
  const queries = [
    "quantum+computing",
    "quantum+cryptography",
    "quantum+communication",
    "quantum+sensing",
  ];
  const articles: RawArticle[] = [];

  for (const q of queries) {
    try {
      const url = `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
      const feed = await rssParser.parseURL(url);
      for (const item of (feed.items || []).slice(0, 10)) {
        if (!item.title || !item.link) continue;
        if (!isQuantumRelated(item.title + " " + (item.contentSnippet || "")))
          continue;
        articles.push({
          title: item.title.replace(/\n/g, " ").trim(),
          url: item.link,
          source: "Google News",
          publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
          rawContent: item.contentSnippet || "",
        });
      }
    } catch (e) {
      console.error(`[Crawler] Google News (${q}) error:`, e);
    }
  }
  return articles;
}

/** Hacker News quantum computing stories */
async function crawlHackerNews(): Promise<RawArticle[]> {
  try {
    const feed = await rssParser.parseURL(
      "https://news.ycombinator.com/rss"
    );
    const articles: RawArticle[] = [];
    for (const item of (feed.items || []).slice(0, 30)) {
      if (!item.title || !item.link) continue;
      if (!isQuantumRelated(item.title + " " + (item.contentSnippet || "")))
        continue;
      articles.push({
        title: item.title.replace(/\n/g, " ").trim(),
        url: item.link,
        source: "Hacker News",
        publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
        rawContent: item.contentSnippet || "",
      });
    }
    return articles;
  } catch (e) {
    console.error("[Crawler] Hacker News error:", e);
    return [];
  }
}

/** MIT Technology Review quantum news */
async function crawlMITTechReview(): Promise<RawArticle[]> {
  try {
    const feed = await rssParser.parseURL(
      "https://www.technologyreview.com/feed/?tagName=quantum-computing"
    );
    const articles: RawArticle[] = [];
    for (const item of (feed.items || []).slice(0, 15)) {
      if (!item.title || !item.link) continue;
      articles.push({
        title: item.title.replace(/\n/g, " ").trim(),
        url: item.link,
        source: "MIT Technology Review",
        publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
        rawContent: item.contentSnippet || item.content || "",
        authors: item.creator || "",
      });
    }
    return articles;
  } catch (e) {
    console.error("[Crawler] MIT Technology Review error:", e);
    return [];
  }
}

/** IEEE Spectrum RSS */
async function crawlIEEE(): Promise<RawArticle[]> {
  try {
    const feed = await rssParser.parseURL(
      "https://spectrum.ieee.org/rss/fulltext"
    );
    const articles: RawArticle[] = [];
    for (const item of (feed.items || []).slice(0, 10)) {
      if (!item.title || !item.link) continue;
      articles.push({
        title: item.title.replace(/\n/g, " ").trim(),
        url: item.link,
        source: "IEEE Spectrum",
        publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
        rawContent: item.contentSnippet || "",
      });
    }
    return articles;
  } catch (e) {
    console.error("[Crawler] IEEE error:", e);
    return [];
  }
}

/** PhysOrg quantum news */
async function crawlPhysOrg(): Promise<RawArticle[]> {
  try {
    const feed = await rssParser.parseURL(
      "https://phys.org/rss-feed/physics-news/quantum-physics/"
    );
    const articles: RawArticle[] = [];
    for (const item of (feed.items || []).slice(0, 10)) {
      if (!item.title || !item.link) continue;
      articles.push({
        title: item.title.replace(/\n/g, " ").trim(),
        url: item.link,
        source: "Phys.org",
        publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
        rawContent: item.contentSnippet || "",
      });
    }
    return articles;
  } catch (e) {
    console.error("[Crawler] PhysOrg error:", e);
    return [];
  }
}

/** Deduplicate articles by URL */
function deduplicateArticles(articles: RawArticle[]): RawArticle[] {
  const seen = new Set<string>();
  return articles.filter((a) => {
    const key = a.url.replace(/[?#].*$/, "").toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Run all crawlers and return deduplicated results */
export async function crawlAllSources(): Promise<RawArticle[]> {
  console.log("[Crawler] Starting all source crawls...");
  const sourceConfig = getRuntimeConfig().sources;

  const allSources: Array<{
    key: SourceKey;
    label: string;
    run: () => Promise<RawArticle[]>;
  }> = [
    { key: "arxiv", label: "arXiv", run: crawlArXiv },
    { key: "googleNews", label: "Google News", run: crawlGoogleNews },
    { key: "hackerNews", label: "Hacker News", run: crawlHackerNews },
    { key: "mitTechReview", label: "MIT Technology Review", run: crawlMITTechReview },
    { key: "ieee", label: "IEEE Spectrum", run: crawlIEEE },
    { key: "physorg", label: "Phys.org", run: crawlPhysOrg },
  ];

  const enabledSources = allSources.filter((source) => sourceConfig[source.key] !== false);
  console.log(
    `[Crawler] Enabled sources: ${
      enabledSources.length > 0
        ? enabledSources.map((s) => s.label).join(", ")
        : "(none)"
    }`
  );

  if (enabledSources.length === 0) {
    console.warn("[Crawler] No sources enabled in runtime config");
    return [];
  }

  const settled = await Promise.allSettled(enabledSources.map((s) => s.run()));
  const all: RawArticle[] = [];

  settled.forEach((result, idx) => {
    const source = enabledSources[idx];
    if (!source) return;

    if (result.status === "fulfilled") {
      all.push(...result.value);
    } else {
      console.error(`[Crawler] ${source.label} failed:`, result.reason);
    }
  });

  const deduped = deduplicateArticles(all);
  console.log(
    `[Crawler] Collected ${all.length} articles, ${deduped.length} after dedup`
  );
  return deduped;
}
