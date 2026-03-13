import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'quantum_daily',
});

const [rows] = await connection.execute('SELECT id, reportDate, status, articleCount, pdfUrl FROM reports ORDER BY createdAt DESC LIMIT 1');
if (rows.length > 0) {
  const r = rows[0];
  console.log('✓ Report found!');
  console.log(`  ID: ${r.id}`);
  console.log(`  Date: ${r.reportDate}`);
  console.log(`  Status: ${r.status}`);
  console.log(`  Articles: ${r.articleCount}`);
  console.log(`  PDF URL: ${r.pdfUrl ? 'YES' : 'NO'}`);
} else {
  console.log('✗ No reports found');
}
await connection.end();
