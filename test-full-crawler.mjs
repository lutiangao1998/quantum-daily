import { crawlAllSources } from './server/crawler.ts';

console.log('[Test] Starting full crawler...');
const start = Date.now();
const articles = await crawlAllSources();
const elapsed = ((Date.now() - start) / 1000).toFixed(1);

console.log(`✓ Collected ${articles.length} articles in ${elapsed}s`);

if (articles.length > 0) {
  console.log('\nFirst 3 articles:');
  articles.slice(0, 3).forEach((a, i) => {
    const date = a.publishedAt ? a.publishedAt.toISOString().split('T')[0] : 'NO DATE';
    console.log(`${i+1}. [${date}] ${a.source}: "${a.title.substring(0, 60)}..."`);
  });
  
  // Check date distribution
  const now = new Date();
  const last24h = articles.filter(a => {
    if (!a.publishedAt) return false;
    return (now.getTime() - a.publishedAt.getTime()) < 24 * 60 * 60 * 1000;
  });
  console.log(`\nDate distribution: ${last24h.length}/${articles.length} from last 24 hours`);
}
