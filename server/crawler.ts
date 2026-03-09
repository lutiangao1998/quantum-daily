import RSSParser from "rss-parser";
import axios from "axios";
import * as cheerio from "cheerio";

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

/** Nature News RSS */
async function crawlNature(): Promise<RawArticle[]> {
  try {
    const feed = await rssParser.parseURL(
      "https://www.nature.com/subjects/quantum-physics.rss"
    );
    const articles: RawArticle[] = [];
    for (const item of (feed.items || []).slice(0, 15)) {
      if (!item.title || !item.link) continue;
      articles.push({
        title: item.title.replace(/\n/g, " ").trim(),
        url: item.link,
        source: "Nature",
        publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
        rawContent: item.contentSnippet || item.content || "",
        authors: item.creator || "",
      });
    }
    return articles;
  } catch (e) {
    console.error("[Crawler] Nature error:", e);
    return [];
  }
}

/** Reuters technology news RSS */
async function crawlReuters(): Promise<RawArticle[]> {
  try {
    const feed = await rssParser.parseURL(
      "https://feeds.reuters.com/reuters/technology"
    );
    const articles: RawArticle[] = [];
    for (const item of (feed.items || []).slice(0, 30)) {
      if (!item.title || !item.link) continue;
      if (!isQuantumRelated(item.title + " " + (item.contentSnippet || "")))
        continue;
      articles.push({
        title: item.title.replace(/\n/g, " ").trim(),
        url: item.link,
        source: "Reuters",
        publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
        rawContent: item.contentSnippet || "",
      });
    }
    return articles;
  } catch (e) {
    console.error("[Crawler] Reuters error:", e);
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

  const [arxiv, googleNews, nature, reuters, ieee, physorg] =
    await Promise.allSettled([
      crawlArXiv(),
      crawlGoogleNews(),
      crawlNature(),
      crawlReuters(),
      crawlIEEE(),
      crawlPhysOrg(),
    ]);

  const all: RawArticle[] = [
    ...(arxiv.status === "fulfilled" ? arxiv.value : []),
    ...(googleNews.status === "fulfilled" ? googleNews.value : []),
    ...(nature.status === "fulfilled" ? nature.value : []),
    ...(reuters.status === "fulfilled" ? reuters.value : []),
    ...(ieee.status === "fulfilled" ? ieee.value : []),
    ...(physorg.status === "fulfilled" ? physorg.value : []),
  ];

  const deduped = deduplicateArticles(all);
  console.log(
    `[Crawler] Collected ${all.length} articles, ${deduped.length} after dedup`
  );
  return deduped;
}
