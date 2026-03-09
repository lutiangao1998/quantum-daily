import cron from "node-cron";
import { runDailyPipeline, getTodayDate } from "./pipeline";

let schedulerStarted = false;

/** Start the daily cron job at UTC 00:00 */
export function startScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;

  console.log("[Scheduler] Starting daily quantum report scheduler...");

  // Run at UTC 00:05 every day (5 minutes after midnight to allow for any clock drift)
  // Cron format: second minute hour day month weekday
  cron.schedule(
    "0 5 0 * * *",
    async () => {
      const date = getTodayDate();
      console.log(`[Scheduler] ⏰ Daily trigger fired for ${date}`);
      try {
        const result = await runDailyPipeline(date);
        if (result.success) {
          console.log(
            `[Scheduler] ✅ Daily pipeline completed: ${result.articleCount} articles, PDF: ${result.pdfUrl}`
          );
        } else {
          console.error(`[Scheduler] ❌ Daily pipeline failed: ${result.error}`);
        }
      } catch (e) {
        console.error("[Scheduler] Unhandled pipeline error:", e);
      }
    },
    {
      timezone: "UTC",
    }
  );

  console.log("[Scheduler] ✅ Cron job scheduled: daily at UTC 00:05");
}
