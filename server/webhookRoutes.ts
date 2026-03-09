import { Router, Request, Response } from "express";
import { ENV } from "./_core/env";
import { runDailyPipeline, getTodayDate } from "./pipeline";
import { getReportByDate, getLatestCompletedReport, getArticlesByReportId } from "./db";

export const webhookRouter = Router();

/** Verify webhook secret from header or query param */
function verifySecret(req: Request): boolean {
  const secret = ENV.webhookSecret;
  if (!secret) return false; // No secret configured = disabled

  const headerSecret =
    req.headers["x-webhook-secret"] ||
    req.headers["authorization"]?.replace("Bearer ", "");
  const querySecret = req.query.secret as string;

  return headerSecret === secret || querySecret === secret;
}

/**
 * POST /api/webhook/trigger
 * OpenClaw calls this every day at UTC 00:00 to trigger the pipeline.
 *
 * Auth: Header `X-Webhook-Secret: <secret>` or query `?secret=<secret>`
 *
 * Body (optional):
 *   { "date": "2026-03-09" }  — override date (defaults to today)
 *
 * Returns:
 *   { success, date, status, message }
 */
webhookRouter.post("/trigger", async (req: Request, res: Response) => {
  if (!verifySecret(req)) {
    res.status(401).json({
      success: false,
      error: "Unauthorized: invalid or missing webhook secret",
    });
    return;
  }

  const date = (req.body?.date as string) || getTodayDate();

  console.log(`[Webhook] Trigger received for date: ${date}`);

  // Fire pipeline in background, return immediately
  runDailyPipeline(date).catch((e) =>
    console.error("[Webhook] Pipeline error:", e)
  );

  res.json({
    success: true,
    date,
    status: "pipeline_started",
    message: `Quantum Daily pipeline started for ${date}. Check /api/webhook/status?date=${date} for progress.`,
  });
});

/**
 * GET /api/webhook/status?date=YYYY-MM-DD
 * OpenClaw polls this to check pipeline progress.
 * No auth required (public status endpoint).
 */
webhookRouter.get("/status", async (req: Request, res: Response) => {
  const date = (req.query.date as string) || getTodayDate();
  const report = await getReportByDate(date);

  if (!report) {
    res.json({
      date,
      exists: false,
      status: "not_started",
      message: `No report found for ${date}. Trigger via POST /api/webhook/trigger.`,
    });
    return;
  }

  res.json({
    date,
    exists: true,
    reportId: report.id,
    status: report.status,
    articleCount: report.articleCount,
    pdfUrl: report.pdfUrl,
    errorMessage: report.errorMessage,
    message:
      report.status === "completed"
        ? `Report ready: ${report.articleCount} articles, PDF at ${report.pdfUrl}`
        : report.status === "failed"
          ? `Pipeline failed: ${report.errorMessage}`
          : `Pipeline in progress: ${report.status}`,
  });
});

/**
 * GET /api/webhook/latest
 * OpenClaw fetches the latest report summary for chat responses.
 * Returns structured JSON optimised for minimal token usage.
 * No auth required.
 */
webhookRouter.get("/latest", async (_req: Request, res: Response) => {
  const report = await getLatestCompletedReport();

  if (!report) {
    res.json({
      available: false,
      message: "No completed reports yet. The first report runs at UTC 00:05.",
      messageZh: "暂无报告，首份报告将在 UTC 00:05 自动生成。",
    });
    return;
  }

  const articles = await getArticlesByReportId(report.id);
  const top5 = articles.slice(0, 5);

  // Compact format to minimise token usage when OpenClaw reads this
  res.json({
    available: true,
    date: report.reportDate,
    titleEn: report.title,
    titleZh: report.titleZh,
    summaryEn: report.summaryEn,
    summaryZh: report.summaryZh,
    total: report.articleCount,
    pdfUrl: report.pdfUrl,
    top: top5.map((a) => ({
      score: a.importanceScore,
      cat: a.category,
      src: a.source,
      en: a.title,
      zh: a.titleZh,
      sumEn: a.summaryEn,
      sumZh: a.summaryZh,
      url: a.url,
    })),
  });
});

/**
 * GET /api/webhook/ping
 * Health check — OpenClaw uses this to verify the gateway is reachable.
 */
webhookRouter.get("/ping", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: "quantum-daily",
    version: "1.1",
    timestamp: new Date().toISOString(),
  });
});
