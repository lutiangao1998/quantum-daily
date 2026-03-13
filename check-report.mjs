import { getDb } from './server/db.ts';

const db = getDb();
const reports = await db.query.reports.findMany({
  limit: 1,
  orderBy: (reports, { desc }) => [desc(reports.createdAt)],
});

if (reports.length > 0) {
  const r = reports[0];
  console.log(`✓ Report found!`);
  console.log(`  ID: ${r.id}`);
  console.log(`  Date: ${r.reportDate}`);
  console.log(`  Status: ${r.status}`);
  console.log(`  Articles: ${r.articleCount}`);
  console.log(`  PDF URL: ${r.pdfUrl ? 'YES' : 'NO'}`);
} else {
  console.log('✗ No reports found');
}
