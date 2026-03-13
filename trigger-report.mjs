import { runDailyPipeline } from './server/pipeline.ts';

console.log('[Manual] Triggering report generation...');
try {
  const result = await runDailyPipeline();
  console.log('[Manual] Report generation result:', result);
} catch (error) {
  console.error('[Manual] Error:', error);
}
