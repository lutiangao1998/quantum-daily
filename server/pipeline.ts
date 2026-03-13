import { getDb } from "./db";
import { reports, articles } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { crawlAllSources, type RawArticle } from "./crawler";
import { analyzeArticles, generateReportSummary } from "./analyzer";
import { buildReportHTML, generateAndUploadPDF } from "./pdfGenerator";
import { notifyOwner } from "./_core/notification";
import { sendDailyReportToSubscribers } from "./emailService";
import { getAllQuantumStocks } from "./stockService";

/** Get today's date in YYYY-MM-DD format (UTC) */
export function getTodayDate(): string {
  return new Date().toISOString().split("T")[0]!;
}

/** Get yesterday's date in YYYY-MM-DD format (UTC) */
export function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return yesterday.toISOString().split("T")[0]!;
}

/** Filter articles to only include those from the last 24 hours (rolling window) */
function filterArticlesByLast24Hours(articles: RawArticle[]): RawArticle[] {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const filtered = articles.filter((article) => {
    if (!article.publishedAt) {
      console.warn(`[Pipeline] Article "${article.title}" has no publishedAt date, skipping`);
      return false;
    }
    return article.publishedAt >= twentyFourHoursAgo && article.publishedAt <= now;
  });
  
  console.log(`[Pipeline] 24-hour filter: ${now.toISOString()} - ${twentyFourHoursAgo.toISOString()}`);
  return filtered;
}

/** Run the full daily pipeline for a given date */
export async function runDailyPipeline(reportDate?: string): Promise<{
  success: boolean;
  reportId?: number;
  articleCount?: number;
  pdfUrl?: string;
  error?: string;
}> {
  const date = reportDate || getTodayDate();
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  console.log(`[Pipeline] Starting daily pipeline for ${date}`);

  // Check if report already exists and completed
  const existing = await db
    .select()
    .from(reports)
    .where(eq(reports.reportDate, date))
    .limit(1);

  let reportId: number;

  if (existing.length > 0 && existing[0]!.status === "completed") {
    console.log(`[Pipeline] Report for ${date} already completed`);
    return {
      success: true,
      reportId: existing[0]!.id,
      articleCount: existing[0]!.articleCount,
      pdfUrl: existing[0]!.pdfUrl || undefined,
    };
  }

  // Create or reset report record
  if (existing.length === 0) {
    const inserted = await db.insert(reports).values({
      reportDate: date,
      title: `Quantum Daily Intelligence Report — ${date}`,
      titleZh: `量子科技每日情报报告 — ${date}`,
      status: "crawling",
      articleCount: 0,
    });
    reportId = Number((inserted as { insertId?: number }).insertId || 0);
    if (!reportId) {
      // Re-fetch
      const fetched = await db
        .select()
        .from(reports)
        .where(eq(reports.reportDate, date))
        .limit(1);
      reportId = fetched[0]!.id;
    }
  } else {
    reportId = existing[0]!.id;
    await db
      .update(reports)
      .set({ status: "crawling", errorMessage: null })
      .where(eq(reports.id, reportId));
  }

  try {
    // ── Step 1: Crawl ──────────────────────────────────────────────
    console.log(`[Pipeline] Step 1: Crawling sources...`);
    const allRawArticles = await crawlAllSources();

    if (allRawArticles.length === 0) {
      throw new Error("No articles collected from any source");
    }

    // ── Step 1.5: Filter by 24-hour rolling window ────────────────────────────────
    console.log(`[Pipeline] Step 1.5: Filtering articles from last 24 hours...`);
    const rawArticles = filterArticlesByLast24Hours(allRawArticles);
    console.log(`[Pipeline] Filtered: ${allRawArticles.length} → ${rawArticles.length} articles from last 24 hours`);

    if (rawArticles.length === 0) {
      throw new Error(`No articles found in the last 24 hours. All ${allRawArticles.length} articles were older.`);
    }

    // ── Step 2: AI Analysis ────────────────────────────────────────
    console.log(`[Pipeline] Step 2: Analyzing ${rawArticles.length} articles with AI...`);
    await db
      .update(reports)
      .set({ status: "analyzing" })
      .where(eq(reports.id, reportId));

    const analyzedArticles = await analyzeArticles(rawArticles);
    const reportSummary = await generateReportSummary(analyzedArticles, date);

    // ── Step 3: Save articles to DB ────────────────────────────────
    console.log(`[Pipeline] Step 3: Saving ${analyzedArticles.length} articles to DB...`);
    // Delete old articles for this report if re-running
    await db.delete(articles).where(eq(articles.reportId, reportId));

    for (const article of analyzedArticles) {
      await db.insert(articles).values({
        reportId,
        title: article.title.slice(0, 1000),
        titleZh: (article.titleZh || article.title).slice(0, 1000),
        url: article.url,
        source: article.source,
        category: article.category,
        summaryEn: article.summaryEn,
        summaryZh: article.summaryZh,
        importanceScore: article.importanceScore,
        authors: article.authors?.slice(0, 500) || null,
        publishedAt: article.publishedAt || null,
        rawContent: article.rawContent?.slice(0, 5000) || null,
      });
    }

    // ── Step 4: Generate PDF ───────────────────────────────────────
    console.log(`[Pipeline] Step 4: Generating PDF report...`);
    await db
      .update(reports)
      .set({ status: "generating" })
      .where(eq(reports.id, reportId));

    const stockSnapshot = await getAllQuantumStocks().catch((error) => {
      console.warn("[Pipeline] Stock snapshot fetch failed:", error);
      return [];
    });
    const html = buildReportHTML(date, reportSummary, analyzedArticles, stockSnapshot);
    const pdfUrl = await generateAndUploadPDF(date, html);

    // ── Step 5: Update report record ───────────────────────────────
    await db
      .update(reports)
      .set({
        title: reportSummary.titleEn,
        titleZh: reportSummary.titleZh,
        summaryEn: reportSummary.summaryEn,
        summaryZh: reportSummary.summaryZh,
        pdfUrl,
        articleCount: analyzedArticles.length,
        status: "completed",
        errorMessage: null,
      })
      .where(eq(reports.id, reportId));

    console.log(`[Pipeline] ✅ Pipeline completed for ${date}. PDF: ${pdfUrl}`);

    // ── Step 6: Send email to subscribers ─────────────────────────
    console.log(`[Pipeline] Step 6: Sending email to subscribers...`);
    const finalReport = await db
      .select()
      .from(reports)
      .where(eq(reports.id, reportId))
      .limit(1)
      .then((r) => r[0]);

    if (finalReport) {
      const topArticles = analyzedArticles
        .sort((a, b) => (b.importanceScore || 0) - (a.importanceScore || 0))
        .slice(0, 10);

      // Build Article objects from analyzed data for email
      const articleObjs = topArticles.map((a, i) => ({
        id: i,
        reportId,
        title: a.title,
        titleZh: a.titleZh || a.title,
        url: a.url,
        source: a.source,
        category: a.category,
        summaryEn: a.summaryEn || null,
        summaryZh: a.summaryZh || null,
        importanceScore: a.importanceScore,
        authors: a.authors || null,
        publishedAt: a.publishedAt || null,
        rawContent: null,
        createdAt: new Date(),
      }));

      const emailResult = await sendDailyReportToSubscribers(finalReport, articleObjs as import('../drizzle/schema').Article[]).catch((e) => {
        console.warn(`[Pipeline] Email send failed:`, e);
        return { sent: 0, failed: 0 };
      });
      console.log(`[Pipeline] 📧 Emails: ${emailResult.sent} sent, ${emailResult.failed} failed`);
    }

    // Notify owner
    await notifyOwner({
      title: `✅ Quantum Daily Report Generated — ${date}`,
      content: `Report for ${date} completed successfully.\n- Articles: ${analyzedArticles.length}\n- PDF: ${pdfUrl}`,
    }).catch(() => {});

    return {
      success: true,
      reportId,
      articleCount: analyzedArticles.length,
      pdfUrl,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Pipeline] ❌ Pipeline failed for ${date}:`, errorMsg);

    await db
      .update(reports)
      .set({ status: "failed", errorMessage: errorMsg })
      .where(eq(reports.id, reportId));

    await notifyOwner({
      title: `❌ Quantum Daily Pipeline Failed — ${date}`,
      content: `Pipeline failed: ${errorMsg}`,
    }).catch(() => {});

    return { success: false, reportId, error: errorMsg };
  }
}
