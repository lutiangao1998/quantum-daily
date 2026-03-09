/**
 * Standalone script to run the quantum daily pipeline directly.
 * Usage: node --import tsx/esm server/runPipeline.mjs [date]
 * 
 * This bypasses the web server and runs the pipeline directly.
 */

// Load env
import { config } from 'dotenv';
config();

const date = process.argv[2] || new Date().toISOString().split('T')[0];
console.log(`[RunPipeline] Starting pipeline for date: ${date}`);
console.log(`[RunPipeline] DATABASE_URL configured: ${!!process.env.DATABASE_URL}`);
console.log(`[RunPipeline] BUILT_IN_FORGE_API_URL: ${process.env.BUILT_IN_FORGE_API_URL?.slice(0, 40)}...`);

// Dynamic import to use TypeScript source
const { runDailyPipeline } = await import('./pipeline.ts');

console.log('[RunPipeline] Pipeline module loaded, starting...');
const result = await runDailyPipeline(date);

console.log('[RunPipeline] Result:', JSON.stringify(result, null, 2));
process.exit(result.success ? 0 : 1);
