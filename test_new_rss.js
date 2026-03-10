import Parser from "rss-parser";

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "Mozilla/5.0 (compatible; QuantumDailyBot/1.0)",
  },
});

const feeds = [
  { name: "arXiv", url: "https://rss.arxiv.org/rss/quant-ph" },
  { name: "Google News", url: "https://news.google.com/rss/search?q=quantum+computing&hl=en-US&gl=US&ceid=US:en" },
  { name: "ScienceDaily", url: "https://www.sciencedaily.com/rss/computers_math/quantum_computing.xml" },
  { name: "MIT Tech Review", url: "https://www.technologyreview.com/feed/?tagName=quantum-computing" },
  { name: "IEEE", url: "https://spectrum.ieee.org/rss/fulltext" },
  { name: "PhysOrg", url: "https://phys.org/rss-feed/physics-news/quantum-physics/" },
];

for (const feed of feeds) {
  try {
    console.log(`Testing ${feed.name}...`);
    const result = await parser.parseURL(feed.url);
    console.log(`✓ ${feed.name}: ${result.items?.length || 0} items`);
  } catch (e) {
    console.log(`✗ ${feed.name}: ${e.message}`);
  }
}
