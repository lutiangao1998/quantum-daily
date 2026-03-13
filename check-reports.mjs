import { getDb } from './server/db.ts';

const db = getDb();
const reports = await db.query.reports.findMany({
  limit: 5,
  orderBy: (reports, { desc }) => [desc(reports.createdAt)],
});

console.log('Reports in database:', reports.length);
reports.forEach(r => {
  console.log(`- ${r.id}: ${r.reportDate} (${r.articleCount} articles, status: ${r.status})`);
});
