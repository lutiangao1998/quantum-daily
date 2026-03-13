import { storagePut } from "./storage";
import type { AnalyzedArticle, ReportSummary } from "./analyzer";
import type { StockQuote } from "./stockService";

const CATEGORY_LABELS: Record<string, { en: string; zh: string; color: string }> = {
  quantum_computing: { en: "Quantum Computing", zh: "量子计算", color: "#6366f1" },
  quantum_communication: { en: "Quantum Communication", zh: "量子通信", color: "#0ea5e9" },
  quantum_sensing: { en: "Quantum Sensing", zh: "量子传感", color: "#10b981" },
  quantum_cryptography: { en: "Quantum Cryptography", zh: "量子密码学", color: "#f59e0b" },
  general: { en: "General", zh: "综合", color: "#8b5cf6" },
};

function getScoreColor(score: number): string {
  if (score >= 8) return "#ef4444";
  if (score >= 6) return "#f59e0b";
  if (score >= 4) return "#10b981";
  return "#6b7280";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateZh(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildArticleCards(articles: AnalyzedArticle[]): string {
  const sorted = [...articles].sort((a, b) => b.importanceScore - a.importanceScore);

  return sorted
    .map((article) => {
      const cat = CATEGORY_LABELS[article.category] || CATEGORY_LABELS.general;
      const scoreColor = getScoreColor(article.importanceScore);
      const pubDate = article.publishedAt
        ? new Date(article.publishedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "";

      return `
      <div class="article-card">
        <div class="article-header">
          <div class="article-meta">
            <span class="category-badge" style="background:${cat.color}20;color:${cat.color};border:1px solid ${cat.color}40">
              ${escapeHtml(cat.zh)} · ${escapeHtml(cat.en)}
            </span>
            <span class="source-badge">${escapeHtml(article.source)}</span>
            ${pubDate ? `<span class="date-badge">${escapeHtml(pubDate)}</span>` : ""}
          </div>
          <div class="score-badge" style="background:${scoreColor}20;color:${scoreColor};border:1px solid ${scoreColor}40">
            ★ ${article.importanceScore.toFixed(1)}
          </div>
        </div>
        <h3 class="article-title-en">${escapeHtml(article.title)}</h3>
        <h3 class="article-title-zh">${escapeHtml(article.titleZh || article.title)}</h3>
        ${article.authors ? `<p class="article-authors">Authors: ${escapeHtml(article.authors)}</p>` : ""}
        <div class="article-summaries">
          <div class="summary-block">
            <span class="summary-lang">EN</span>
            <p>${escapeHtml(article.summaryEn || "")}</p>
          </div>
          <div class="summary-block">
            <span class="summary-lang">中</span>
            <p>${escapeHtml(article.summaryZh || "")}</p>
          </div>
        </div>
        <a class="article-link" href="${escapeHtml(article.url)}">
          🔗 Read Full Article → ${escapeHtml(article.url.slice(0, 80))}${article.url.length > 80 ? "..." : ""}
        </a>
      </div>`;
    })
    .join("\n");
}

function buildCategoryStats(articles: AnalyzedArticle[]): string {
  const counts: Record<string, number> = {};
  for (const a of articles) {
    counts[a.category] = (counts[a.category] || 0) + 1;
  }

  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, count]) => {
      const label = CATEGORY_LABELS[cat] || CATEGORY_LABELS.general;
      const pct = Math.round((count / articles.length) * 100);
      return `
      <div class="stat-item">
        <div class="stat-header">
          <span class="stat-label" style="color:${label.color}">${label.zh} / ${label.en}</span>
          <span class="stat-count">${count} articles (${pct}%)</span>
        </div>
        <div class="stat-bar-bg">
          <div class="stat-bar" style="width:${pct}%;background:${label.color}"></div>
        </div>
      </div>`;
    })
    .join("\n");
}

function buildStockSnapshot(stocks: StockQuote[]): string {
  if (stocks.length === 0) {
    return `<div class="stock-empty">Stock snapshot unavailable for this report run.</div>`;
  }

  return stocks
    .map((stock) => {
      const isUp = stock.change >= 0;
      const changeColor = isUp ? "#22c55e" : "#ef4444";
      const sign = isUp ? "+" : "";
      return `
      <div class="stock-card">
        <div class="stock-head">
          <div class="stock-symbol">${escapeHtml(stock.symbol)}</div>
          <div class="stock-name">${escapeHtml(stock.name)}</div>
        </div>
        <div class="stock-price">$${stock.price.toFixed(2)}</div>
        <div class="stock-change" style="color:${changeColor}">
          ${sign}${stock.change.toFixed(2)} (${(stock.changePercent * 100).toFixed(2)}%)
        </div>
        <div class="stock-meta">
          <span>H: $${stock.dayHigh.toFixed(2)}</span>
          <span>L: $${stock.dayLow.toFixed(2)}</span>
          <span>Vol: ${stock.volume.toLocaleString("en-US")}</span>
        </div>
      </div>`;
    })
    .join("\n");
}

export function buildReportHTML(
  reportDate: string,
  summary: ReportSummary,
  articles: AnalyzedArticle[],
  stocks: StockQuote[] = []
): string {
  const topArticles = [...articles]
    .sort((a, b) => b.importanceScore - a.importanceScore)
    .slice(0, 5);

  const highImpact = articles.filter((a) => a.importanceScore >= 7).length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(summary.titleEn)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+SC:wght@300;400;500;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Inter', 'Noto Sans SC', -apple-system, sans-serif;
    background: #0a0e1a;
    color: #e2e8f0;
    line-height: 1.6;
    font-size: 13px;
  }

  .page { max-width: 900px; margin: 0 auto; padding: 40px 32px; }

  /* ── Cover ── */
  .cover {
    background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0c1445 100%);
    border: 1px solid #312e81;
    border-radius: 16px;
    padding: 48px 40px;
    margin-bottom: 32px;
    position: relative;
    overflow: hidden;
  }
  .cover::before {
    content: '';
    position: absolute;
    top: -60px; right: -60px;
    width: 240px; height: 240px;
    background: radial-gradient(circle, #6366f140 0%, transparent 70%);
  }
  .cover-brand {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 3px;
    color: #818cf8;
    text-transform: uppercase;
    margin-bottom: 16px;
  }
  .cover-title-en {
    font-size: 28px;
    font-weight: 700;
    color: #f1f5f9;
    line-height: 1.3;
    margin-bottom: 8px;
  }
  .cover-title-zh {
    font-size: 20px;
    font-weight: 500;
    color: #a5b4fc;
    margin-bottom: 24px;
  }
  .cover-date {
    font-size: 13px;
    color: #64748b;
    margin-bottom: 24px;
  }
  .cover-stats {
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
  }
  .cover-stat {
    background: #ffffff08;
    border: 1px solid #ffffff15;
    border-radius: 10px;
    padding: 12px 20px;
    text-align: center;
  }
  .cover-stat-num {
    font-size: 24px;
    font-weight: 700;
    color: #818cf8;
  }
  .cover-stat-label {
    font-size: 11px;
    color: #64748b;
    margin-top: 2px;
  }
  .powered-by {
    position: absolute;
    bottom: 20px;
    right: 24px;
    font-size: 10px;
    color: #334155;
    letter-spacing: 1px;
  }

  /* ── Section ── */
  .section {
    margin-bottom: 32px;
  }
  .section-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 2px;
    color: #6366f1;
    text-transform: uppercase;
    border-bottom: 1px solid #1e293b;
    padding-bottom: 8px;
    margin-bottom: 16px;
  }

  /* ── Executive Summary ── */
  .summary-card {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-left: 3px solid #6366f1;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 16px;
  }
  .summary-card p {
    color: #94a3b8;
    line-height: 1.8;
    margin-bottom: 12px;
  }
  .summary-card p:last-child { margin-bottom: 0; }
  .summary-lang-tag {
    display: inline-block;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1px;
    color: #6366f1;
    background: #6366f115;
    border: 1px solid #6366f130;
    border-radius: 4px;
    padding: 2px 8px;
    margin-bottom: 10px;
  }

  /* ── Category Stats ── */
  .stats-grid {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 12px;
    padding: 20px;
  }
  .stat-item { margin-bottom: 14px; }
  .stat-item:last-child { margin-bottom: 0; }
  .stat-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
  }
  .stat-label { font-size: 12px; font-weight: 600; }
  .stat-count { font-size: 11px; color: #64748b; }
  .stat-bar-bg {
    background: #1e293b;
    border-radius: 4px;
    height: 6px;
    overflow: hidden;
  }
  .stat-bar { height: 100%; border-radius: 4px; }

  /* ── Stock Snapshot ── */
  .stocks-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }
  .stock-card {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 10px;
    padding: 12px;
  }
  .stock-head {
    margin-bottom: 6px;
  }
  .stock-symbol {
    font-size: 12px;
    font-weight: 700;
    color: #f1f5f9;
  }
  .stock-name {
    font-size: 10px;
    color: #64748b;
  }
  .stock-price {
    font-size: 18px;
    font-weight: 700;
    color: #f8fafc;
    margin-bottom: 3px;
  }
  .stock-change {
    font-size: 11px;
    font-weight: 600;
    margin-bottom: 6px;
  }
  .stock-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 10px;
    color: #64748b;
  }
  .stock-empty {
    background: #0f172a;
    border: 1px dashed #334155;
    border-radius: 10px;
    padding: 14px;
    color: #64748b;
    font-size: 11px;
  }

  /* ── Top Stories ── */
  .top-story {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 10px;
    padding: 16px 20px;
    margin-bottom: 10px;
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }
  .top-story-rank {
    font-size: 20px;
    font-weight: 800;
    color: #1e293b;
    min-width: 28px;
    line-height: 1;
    margin-top: 2px;
  }
  .top-story-content { flex: 1; }
  .top-story-title { font-size: 13px; font-weight: 600; color: #f1f5f9; margin-bottom: 2px; }
  .top-story-title-zh { font-size: 12px; color: #818cf8; margin-bottom: 6px; }
  .top-story-meta { font-size: 11px; color: #475569; }

  /* ── Article Cards ── */
  .article-card {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 16px;
    page-break-inside: avoid;
  }
  .article-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10px;
    gap: 8px;
  }
  .article-meta { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  .category-badge, .source-badge, .date-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 20px;
    white-space: nowrap;
  }
  .source-badge {
    background: #1e293b;
    color: #94a3b8;
    border: 1px solid #334155;
  }
  .date-badge {
    background: #0f172a;
    color: #475569;
    border: 1px solid #1e293b;
  }
  .score-badge {
    font-size: 11px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 20px;
    white-space: nowrap;
  }
  .article-title-en {
    font-size: 14px;
    font-weight: 600;
    color: #f1f5f9;
    margin-bottom: 4px;
    line-height: 1.4;
  }
  .article-title-zh {
    font-size: 13px;
    font-weight: 500;
    color: #818cf8;
    margin-bottom: 8px;
    line-height: 1.4;
  }
  .article-authors {
    font-size: 11px;
    color: #475569;
    margin-bottom: 10px;
    font-style: italic;
  }
  .article-summaries {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 12px;
  }
  .summary-block {
    background: #0a0e1a;
    border: 1px solid #1e293b;
    border-radius: 8px;
    padding: 12px;
  }
  .summary-lang {
    display: inline-block;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 1px;
    color: #6366f1;
    background: #6366f115;
    border-radius: 3px;
    padding: 1px 6px;
    margin-bottom: 6px;
  }
  .summary-block p {
    font-size: 11px;
    color: #94a3b8;
    line-height: 1.7;
  }
  .article-link {
    font-size: 10px;
    color: #6366f1;
    word-break: break-all;
    text-decoration: none;
    display: block;
    padding: 6px 10px;
    background: #6366f108;
    border: 1px solid #6366f120;
    border-radius: 6px;
  }

  /* ── Footer ── */
  .footer {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid #1e293b;
    text-align: center;
    color: #334155;
    font-size: 11px;
  }

  @media print {
    body { background: white; color: #1a1a2e; }
    .cover { background: #1a1a2e !important; }
    .article-card { border: 1px solid #e2e8f0; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Cover -->
  <div class="cover">
    <div class="cover-brand">⚛ Quantum Daily Intelligence Report</div>
    <div class="cover-title-en">${escapeHtml(summary.titleEn)}</div>
    <div class="cover-title-zh">${escapeHtml(summary.titleZh)}</div>
    <div class="cover-date">
      📅 ${escapeHtml(formatDate(reportDate))} &nbsp;·&nbsp; ${escapeHtml(formatDateZh(reportDate))}
    </div>
    <div class="cover-stats">
      <div class="cover-stat">
        <div class="cover-stat-num">${articles.length}</div>
        <div class="cover-stat-label">Total Articles</div>
      </div>
      <div class="cover-stat">
        <div class="cover-stat-num">${highImpact}</div>
        <div class="cover-stat-label">High Impact (≥7)</div>
      </div>
      <div class="cover-stat">
        <div class="cover-stat-num">${Array.from(new Set(articles.map((a) => a.source))).length}</div>
        <div class="cover-stat-label">Sources</div>
      </div>
      <div class="cover-stat">
        <div class="cover-stat-num">${Array.from(new Set(articles.map((a) => a.category))).length}</div>
        <div class="cover-stat-label">Categories</div>
      </div>
    </div>
    <div class="powered-by">POWERED BY QUANTUM DAILY × OPENCLAW AI</div>
  </div>

  <!-- Executive Summary -->
  <div class="section">
    <div class="section-title">Executive Summary / 执行摘要</div>
    <div class="summary-card">
      <div class="summary-lang-tag">ENGLISH</div>
      ${summary.summaryEn.split("\n\n").map((p) => `<p>${escapeHtml(p)}</p>`).join("")}
    </div>
    <div class="summary-card">
      <div class="summary-lang-tag">中文</div>
      ${summary.summaryZh.split("\n\n").map((p) => `<p>${escapeHtml(p)}</p>`).join("")}
    </div>
  </div>

  <!-- Category Distribution -->
  <div class="section">
    <div class="section-title">Category Distribution / 分类分布</div>
    <div class="stats-grid">
      ${buildCategoryStats(articles)}
    </div>
  </div>

  <!-- Quantum Stock Snapshot -->
  <div class="section">
    <div class="section-title">Quantum Stock Snapshot / 量子概念股快照</div>
    <div class="stocks-grid">
      ${buildStockSnapshot(stocks)}
    </div>
  </div>

  <!-- Top 5 Stories -->
  <div class="section">
    <div class="section-title">Top Stories / 头条新闻</div>
    ${topArticles
      .map(
        (a, i) => `
    <div class="top-story">
      <div class="top-story-rank">#${i + 1}</div>
      <div class="top-story-content">
        <div class="top-story-title">${escapeHtml(a.title)}</div>
        <div class="top-story-title-zh">${escapeHtml(a.titleZh || a.title)}</div>
        <div class="top-story-meta">
          ${escapeHtml(a.source)} · ${escapeHtml(CATEGORY_LABELS[a.category]?.en || "General")} · Score: ${a.importanceScore.toFixed(1)}
        </div>
      </div>
    </div>`
      )
      .join("")}
  </div>

  <!-- All Articles -->
  <div class="section">
    <div class="section-title">All Articles / 全部文章 (${articles.length})</div>
    ${buildArticleCards(articles)}
  </div>

  <div class="footer">
    <p>Quantum Daily Intelligence Report · ${escapeHtml(formatDate(reportDate))}</p>
    <p>Generated by Quantum Daily Platform × OpenClaw AI · For research and informational purposes only.</p>
    <p>量子每日情报报告 · 由量子每日平台 × OpenClaw AI 生成 · 仅供研究和信息参考</p>
  </div>

</div>
</body>
</html>`;
}

/** Generate PDF from HTML using puppeteer and upload to S3 */
export async function generateAndUploadPDF(
  reportDate: string,
  html: string
): Promise<string> {
  // Use puppeteer if available, otherwise fall back to html storage
  try {
    // Dynamic import to avoid startup errors if puppeteer not installed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const puppeteer = await import("puppeteer").catch(() => null) as any;

    if (puppeteer) {
      const browser = await puppeteer.default.launch({
        headless: true,
        executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium-browser",
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--font-render-hinting=none",
        ],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });
      await browser.close();

      const key = `reports/${reportDate}/quantum-daily-${reportDate}.pdf`;
      const { url } = await storagePut(key, Buffer.from(pdfBuffer), "application/pdf");
      return url;
    }
  } catch (e) {
    console.warn("[PDF] Puppeteer not available, storing HTML:", e);
  }

  // Fallback: store HTML as-is (still downloadable)
  const key = `reports/${reportDate}/quantum-daily-${reportDate}.html`;
  const { url } = await storagePut(key, Buffer.from(html, "utf-8"), "text/html");
  return url;
}
