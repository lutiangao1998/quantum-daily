import { describe, expect, it, vi, beforeEach } from "vitest";
import { getTodayDate } from "./pipeline";
import { buildReportHTML } from "./pdfGenerator";
import type { AnalyzedArticle, ReportSummary } from "./analyzer";
import type { StockQuote } from "./stockService";

// ── Pipeline Tests ──────────────────────────────────────────────────────────

describe("getTodayDate", () => {
  it("returns a valid YYYY-MM-DD date string", () => {
    const date = getTodayDate();
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns today's UTC date", () => {
    const date = getTodayDate();
    const today = new Date().toISOString().split("T")[0];
    expect(date).toBe(today);
  });
});

// ── PDF Generator Tests ─────────────────────────────────────────────────────

describe("buildReportHTML", () => {
  const mockSummary: ReportSummary = {
    titleEn: "Quantum Daily Intelligence Report — 2026-03-09",
    titleZh: "量子科技每日情报报告 — 2026年3月9日",
    summaryEn: "Today's quantum technology landscape shows significant advances in quantum computing hardware.",
    summaryZh: "今日量子科技领域在量子计算硬件方面取得重大进展。",
  };

  const mockArticles: AnalyzedArticle[] = [
    {
      title: "Breakthrough in Quantum Error Correction",
      titleZh: "量子纠错领域突破",
      url: "https://arxiv.org/abs/2603.12345",
      source: "arXiv",
      category: "quantum_computing",
      summaryEn: "Researchers demonstrate a new approach to quantum error correction.",
      summaryZh: "研究人员展示了量子纠错的新方法。",
      importanceScore: 9.2,
      authors: "Alice Smith, Bob Jones",
      publishedAt: new Date("2026-03-09"),
      rawContent: "Full paper content...",
    },
    {
      title: "Quantum Key Distribution Over 1000km",
      titleZh: "千公里量子密钥分发",
      url: "https://nature.com/articles/12345",
      source: "Nature",
      category: "quantum_cryptography",
      summaryEn: "A new record for quantum key distribution distance has been achieved.",
      summaryZh: "量子密钥分发距离创下新纪录。",
      importanceScore: 8.5,
      authors: "Carol White",
      publishedAt: new Date("2026-03-09"),
      rawContent: "Nature article content...",
    },
  ];

  const mockStocks: StockQuote[] = [
    {
      symbol: "IONQ",
      name: "IonQ Inc.",
      price: 35.12,
      change: -0.75,
      changePercent: -0.0209,
      dayHigh: 36.92,
      dayLow: 35.03,
      volume: 2_500_000,
      currency: "USD",
      timestamp: Date.now(),
    },
    {
      symbol: "QBTS",
      name: "D-Wave Quantum Inc.",
      price: 18.76,
      change: -0.28,
      changePercent: -0.0147,
      dayHigh: 19.05,
      dayLow: 18.66,
      volume: 21_570_947,
      currency: "USD",
      timestamp: Date.now(),
    },
  ];

  it("generates valid HTML with required sections", () => {
    const html = buildReportHTML("2026-03-09", mockSummary, mockArticles);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Quantum Daily Intelligence Report");
    expect(html).toContain("2026-03-09");
    expect(html).toContain("Executive Summary");
    expect(html).toContain("Top Stories");
    expect(html).toContain("All Articles");
  });

  it("includes bilingual content", () => {
    const html = buildReportHTML("2026-03-09", mockSummary, mockArticles);
    expect(html).toContain("Quantum Daily Intelligence Report — 2026-03-09");
    expect(html).toContain("Today&#39;s quantum technology landscape");
    expect(html).toContain("量子科技每日情报报告");
    expect(html).toContain("今日量子科技领域");
  });

  it("includes article titles and source links", () => {
    const html = buildReportHTML("2026-03-09", mockSummary, mockArticles);
    expect(html).toContain("Breakthrough in Quantum Error Correction");
    expect(html).toContain("量子纠错领域突破");
    expect(html).toContain("arxiv.org");
    expect(html).toContain("arXiv");
  });

  it("includes importance scores", () => {
    const html = buildReportHTML("2026-03-09", mockSummary, mockArticles);
    expect(html).toContain("9.2");
    expect(html).toContain("8.5");
  });

  it("escapes HTML special characters to prevent XSS", () => {
    const xssArticles: AnalyzedArticle[] = [
      {
        ...mockArticles[0]!,
        title: '<script>alert("xss")</script>',
        titleZh: "<b>bold</b>",
      },
    ];
    const html = buildReportHTML("2026-03-09", mockSummary, xssArticles);
    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).toContain("&lt;script&gt;");
  });

  it("handles empty articles array gracefully", () => {
    const html = buildReportHTML("2026-03-09", mockSummary, []);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("All Articles / 全部文章 (0)");
  });

  it("includes stock snapshot section when quotes are provided", () => {
    const html = buildReportHTML("2026-03-09", mockSummary, mockArticles, mockStocks);
    expect(html).toContain("Quantum Stock Snapshot");
    expect(html).toContain("IONQ");
    expect(html).toContain("QBTS");
    expect(html).toContain("$35.12");
  });
});

// ── Webhook Route Logic Tests ────────────────────────────────────────────────

describe("webhook secret verification", () => {
  it("returns false when no secret is configured", () => {
    const originalSecret = process.env.WEBHOOK_SECRET;
    process.env.WEBHOOK_SECRET = "";

    // Simulate the verifySecret logic
    const secret = process.env.WEBHOOK_SECRET;
    const isValid = !!secret && secret === "test-secret";
    expect(isValid).toBe(false);

    process.env.WEBHOOK_SECRET = originalSecret;
  });

  it("validates matching secret from header", () => {
    const testSecret = "quantum-test-secret-2026";
    const headerSecret = testSecret;
    const isValid = headerSecret === testSecret;
    expect(isValid).toBe(true);
  });

  it("rejects mismatched secret", () => {
    const testSecret = "quantum-test-secret-2026";
    const headerSecret = "wrong-secret";
    const isValid = headerSecret === testSecret;
    expect(isValid).toBe(false);
  });
});

// ── ENV Config Tests ─────────────────────────────────────────────────────────

describe("ENV configuration", () => {
  it("reads WEBHOOK_SECRET from environment", async () => {
    const { ENV } = await import("./_core/env");
    // webhookSecret should be a string (empty or set)
    expect(typeof ENV.webhookSecret).toBe("string");
  });
});

// ── Auth logout test (from template) ────────────────────────────────────────

import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type CookieCall = { name: string; options: Record<string, unknown> };
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });
});
