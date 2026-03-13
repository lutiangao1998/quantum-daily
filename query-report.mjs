import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'quantum_daily',
});

const [rows] = await connection.execute(
  'SELECT id, reportDate, status, articleCount, errorMessage FROM reports ORDER BY createdAt DESC LIMIT 3'
);

console.log('Reports in database:');
rows.forEach(r => {
  console.log(`\nID: ${r.id}`);
  console.log(`Date: ${r.reportDate}`);
  console.log(`Status: ${r.status}`);
  console.log(`Articles: ${r.articleCount}`);
  if (r.errorMessage) console.log(`Error: ${r.errorMessage}`);
});

await connection.end();
