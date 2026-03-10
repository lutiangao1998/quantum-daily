import Parser from "rss-parser";

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "Mozilla/5.0 (compatible; QuantumDailyBot/1.0)",
  },
});

try {
  console.log("Testing Hacker News...");
  const result = await parser.parseURL("https://news.ycombinator.com/rss");
  console.log(`✓ Hacker News: ${result.items?.length || 0} items`);
} catch (e) {
  console.log(`✗ Hacker News: ${e.message}`);
}
