import { runDailyPipeline } from './server/pipeline.ts';

console.log('[Manual] Triggering daily pipeline...');
const start = Date.now();
try {
  const result = await runDailyPipeline();
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  
  if (result.success) {
    console.log(`✓ Report generated successfully in ${elapsed}s`);
    console.log(`  Report ID: ${result.reportId}`);
    console.log(`  Articles: ${result.articleCount}`);
    console.log(`  PDF URL: ${result.pdfUrl}`);
  } else {
    console.log(`✗ Report generation failed: ${result.error}`);
  }
} catch (error) {
  console.error('✗ Error:', error);
}
