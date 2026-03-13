import Parser from 'rss-parser';

const rssParser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": "Mozilla/5.0 (compatible; QuantumDailyBot/1.0; +https://quantum-daily.manus.space)",
  },
});

console.log('[Test] Fetching arXiv feed...');
try {
  const feed = await rssParser.parseURL('https://rss.arxiv.org/rss/quant-ph');
  console.log(`✓ Got ${feed.items.length} items from arXiv`);
  
  if (feed.items.length > 0) {
    const item = feed.items[0];
    console.log('\nFirst item:');
    console.log(`  Title: ${item.title}`);
    console.log(`  PubDate: ${item.pubDate}`);
    console.log(`  Parsed: ${new Date(item.pubDate).toISOString()}`);
  }
} catch (e) {
  console.error('✗ Error:', e.message);
}
