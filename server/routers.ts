import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getReportsList,
  getReportByDate,
  getReportById,
  getArticlesByReportId,
  getLatestCompletedReport,
} from "./db";
import { runDailyPipeline, getTodayDate } from "./pipeline";
import { getActiveProvider, PROVIDER_COSTS } from "./llmClient";
import {
  subscribeEmail,
  unsubscribeByToken,
  getSubscriberStats,
} from "./emailService";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  /** LLM provider status — used by admin panel */
  llm: router({
    status: publicProcedure.query(() => {
      const provider = getActiveProvider();
      const costs = PROVIDER_COSTS[provider];
      const hasDeepseek = !!process.env.DEEPSEEK_API_KEY;
      const hasOpenai = !!process.env.OPENAI_API_KEY;
      return {
        activeProvider: provider,
        activeLabel: costs.label,
        inputCostPer1M: costs.input,
        outputCostPer1M: costs.output,
        hasDeepseek,
        hasOpenai,
        hasManus: true,
        // Estimated cost per daily report (55 articles × ~800 tokens avg)
        estimatedDailyCostUSD:
          provider === "manus" ? null : ((55 * 800 * costs.input) / 1_000_000 + (55 * 400 * costs.output) / 1_000_000),
      };
    }),
  }),

  reports: router({
    /** List reports with optional date range filter */
    list: publicProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
          dateFrom: z.string().optional(),
          dateTo: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        return getReportsList(input);
      }),

    /** Get a single report by date */
    byDate: publicProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ input }) => {
        return getReportByDate(input.date);
      }),

    /** Get a single report by ID with its articles */
    byId: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const [report, articles] = await Promise.all([
          getReportById(input.id),
          getArticlesByReportId(input.id),
        ]);
        if (!report) return null;
        return { ...report, articles };
      }),

    /** Get latest completed report */
    latest: publicProcedure.query(async () => {
      const report = await getLatestCompletedReport();
      if (!report) return null;
      const articles = await getArticlesByReportId(report.id);
      return { ...report, articles };
    }),

    /** Get articles for a report */
    articles: publicProcedure
      .input(z.object({ reportId: z.number() }))
      .query(async ({ input }) => {
        return getArticlesByReportId(input.reportId);
      }),

    /** Manually trigger pipeline generation (admin only) */
    triggerGeneration: protectedProcedure
      .input(z.object({ date: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        // Only allow admin or owner to trigger
        if (ctx.user.role !== "admin") {
          throw new Error("Unauthorized: admin role required");
        }
        const date = input.date || getTodayDate();
        // Run pipeline in background
        runDailyPipeline(date).catch((e) =>
          console.error("[Router] Pipeline error:", e)
        );
        return { started: true, date };
      }),

    /** Get pipeline status for a date */
    status: publicProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ input }) => {
        const report = await getReportByDate(input.date);
        if (!report) return { exists: false, status: null };
        return {
          exists: true,
          status: report.status,
          articleCount: report.articleCount,
          pdfUrl: report.pdfUrl,
          errorMessage: report.errorMessage,
        };
      }),

    /** OpenClaw API: get latest report summary for WhatsApp/Telegram */
    openclaw: publicProcedure.query(async () => {
      const report = await getLatestCompletedReport();
      if (!report) {
        return {
          available: false,
          message: "No reports available yet. The first report will be generated at UTC 00:00.",
          messageZh: "暂无报告。首份报告将在 UTC 00:00 自动生成。",
        };
      }
      const articles = await getArticlesByReportId(report.id);
      const topArticles = articles.slice(0, 5);
      return {
        available: true,
        date: report.reportDate,
        title: report.title,
        titleZh: report.titleZh,
        summaryEn: report.summaryEn,
        summaryZh: report.summaryZh,
        articleCount: report.articleCount,
        pdfUrl: report.pdfUrl,
        topArticles: topArticles.map((a) => ({
          title: a.title,
          titleZh: a.titleZh,
          source: a.source,
          category: a.category,
          importanceScore: a.importanceScore,
          summaryEn: a.summaryEn,
          summaryZh: a.summaryZh,
          url: a.url,
        })),
      };
    }),
  }),

  /** Email subscription management */
  email: router({
    /** Subscribe to daily reports */
    subscribe: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          name: z.string().max(128).optional(),
          locale: z.enum(["en", "zh"]).default("zh"),
        })
      )
      .mutation(async ({ input }) => {
        return subscribeEmail(input.email, input.name, input.locale);
      }),

    /** Unsubscribe by token (from email link) */
    unsubscribe: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        const ok = await unsubscribeByToken(input.token);
        return { success: ok };
      }),

    /** Get subscriber stats (admin only) */
    stats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new Error("Unauthorized");
      return getSubscriberStats();
    }),
  }),
});

export type AppRouter = typeof appRouter;

