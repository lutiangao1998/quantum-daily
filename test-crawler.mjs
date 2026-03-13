import { crawlAllSources } from './server/crawler.ts';

console.log('[Test] Starting crawler...');
const articles = await crawlAllSources();
console.log(`[Test] Collected ${articles.length} articles`);

if (articles.length > 0) {
  console.log('\nFirst 3 articles:');
  articles.slice(0, 3).forEach((a, i) => {
    console.log(`${i+1}. "${a.title.substring(0, 60)}..."`);
    console.log(`   Source: ${a.source}, Published: ${a.publishedAt?.toISOString()}`);
  });
}
