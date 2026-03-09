/**
 * Email delivery service for Quantum Daily.
 * Uses Resend API to send beautifully formatted daily reports.
 */

import { getDb } from "./db";
import { emailSubscriptions } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import type { Report, Article } from "../drizzle/schema";
import { nanoid } from "nanoid";

const RESEND_API_URL = "https://api.resend.com/emails";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{ filename: string; content: string; contentType: string }>;
}

/** Send an email via Resend API */
export async function sendEmail(options: SendEmailOptions): Promise<{ id: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  if (!apiKey) throw new Error("RESEND_API_KEY not configured");

  const body: Record<string, unknown> = {
    from: `Quantum Daily <${fromEmail}>`,
    to: Array.isArray(options.to) ? options.to : [options.to],
    subject: options.subject,
    html: options.html,
  };

  if (options.text) body.text = options.text;
  if (options.attachments) body.attachments = options.attachments;

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text().catch(() => "unknown");
    throw new Error(`Resend API error ${response.status}: ${error.slice(0, 200)}`);
  }

  return response.json() as Promise<{ id: string }>;
}

/** Generate secure unsubscribe token */
export function generateUnsubscribeToken(): string {
  return nanoid(32);
}

/** Subscribe an email to daily reports */
export async function subscribeEmail(
  email: string,
  name?: string,
  locale: "en" | "zh" = "zh"
): Promise<{ success: boolean; message: string; alreadyExists?: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if already subscribed
  const existing = await db
    .select()
    .from(emailSubscriptions)
    .where(eq(emailSubscriptions.email, email.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    const sub = existing[0]!;
    if (sub.active === "yes") {
      return { success: false, message: "This email is already subscribed.", alreadyExists: true };
    }
    // Reactivate
    await db
      .update(emailSubscriptions)
      .set({ active: "yes", name: name || sub.name, locale })
      .where(eq(emailSubscriptions.id, sub.id));
    return { success: true, message: "Subscription reactivated successfully!" };
  }

  // New subscription
  await db.insert(emailSubscriptions).values({
    email: email.toLowerCase(),
    name: name || null,
    locale,
    active: "yes",
    unsubscribeToken: generateUnsubscribeToken(),
    sentCount: 0,
  });

  // Send welcome email
  try {
    await sendWelcomeEmail(email, name, locale);
  } catch (e) {
    console.warn("[Email] Welcome email failed:", e);
  }

  return { success: true, message: "Subscribed successfully! You'll receive your first report tomorrow." };
}

/** Unsubscribe by token */
export async function unsubscribeByToken(token: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .update(emailSubscriptions)
    .set({ active: "no" })
    .where(eq(emailSubscriptions.unsubscribeToken, token));

  return (result[0] as { affectedRows?: number })?.affectedRows === 1;
}

/** Send daily report to all active subscribers */
export async function sendDailyReportToSubscribers(
  report: Report,
  topArticles: Article[]
): Promise<{ sent: number; failed: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const subscribers = await db
    .select()
    .from(emailSubscriptions)
    .where(and(eq(emailSubscriptions.active, "yes")));

  console.log(`[Email] Sending daily report to ${subscribers.length} subscribers...`);

  let sent = 0;
  let failed = 0;

  for (const sub of subscribers) {
    try {
      const html = generateReportEmailHtml(report, topArticles, sub.locale as "en" | "zh", sub.unsubscribeToken);
      const subject = sub.locale === "zh"
        ? `⚛ 量子科技每日情报 — ${report.reportDate} (${report.articleCount} 篇文章)`
        : `⚛ Quantum Daily Intelligence — ${report.reportDate} (${report.articleCount} articles)`;

      await sendEmail({ to: sub.email, subject, html });

      // Update last sent
      await db
        .update(emailSubscriptions)
        .set({ lastSentAt: new Date(), sentCount: (sub.sentCount || 0) + 1 })
        .where(eq(emailSubscriptions.id, sub.id));

      sent++;
      console.log(`[Email] ✓ Sent to ${sub.email}`);
    } catch (e) {
      failed++;
      console.error(`[Email] ✗ Failed to send to ${sub.email}:`, e);
    }

    // Small delay between sends to respect rate limits
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`[Email] Done: ${sent} sent, ${failed} failed`);
  return { sent, failed };
}

/** Generate welcome email HTML */
function sendWelcomeEmail(email: string, name?: string | null, locale: "en" | "zh" = "zh"): Promise<{ id: string }> {
  const siteUrl = process.env.VITE_APP_ID
    ? `https://quantumnews-j6gvqm4g.manus.space`
    : "https://quantumnews-j6gvqm4g.manus.space";

  const isZh = locale === "zh";
  const greeting = name ? (isZh ? `你好，${name}！` : `Hello, ${name}!`) : (isZh ? "你好！" : "Hello!");

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050810;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:32px;margin-bottom:8px;">⚛</div>
      <h1 style="color:#fff;font-size:24px;margin:0;font-weight:700;">Quantum Daily</h1>
      <p style="color:#6366f1;font-size:14px;margin:4px 0 0;">量子科技每日情报平台</p>
    </div>
    <div style="background:#0f1629;border:1px solid #1e2d4a;border-radius:12px;padding:32px;">
      <h2 style="color:#fff;font-size:20px;margin:0 0 16px;">${greeting}</h2>
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 16px;">
        ${isZh
          ? "感谢您订阅量子科技每日情报！您将在每天 UTC 00:05 之后收到一封包含最新量子技术动态的邮件，涵盖量子计算、量子通信、量子传感和量子密码学领域。"
          : "Thank you for subscribing to Quantum Daily Intelligence! You'll receive a daily email after UTC 00:05 covering the latest developments in quantum computing, communication, sensing, and cryptography."}
      </p>
      <div style="background:#1a2744;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="color:#6366f1;font-size:13px;font-weight:600;margin:0 0 8px;">
          ${isZh ? "每日报告包含：" : "Each daily report includes:"}
        </p>
        <ul style="color:#94a3b8;font-size:13px;margin:0;padding-left:20px;line-height:2;">
          <li>${isZh ? "全球量子领域重要新闻与研究论文摘要" : "Key quantum news and research paper summaries"}</li>
          <li>${isZh ? "AI 生成的中英双语摘要" : "AI-generated bilingual (EN/ZH) summaries"}</li>
          <li>${isZh ? "重要性评分与分类标签" : "Importance scores and category tags"}</li>
          <li>${isZh ? "可下载的完整 PDF 报告" : "Downloadable full PDF report"}</li>
        </ul>
      </div>
      <a href="${siteUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;margin-top:8px;">
        ${isZh ? "访问平台" : "Visit Platform"} →
      </a>
    </div>
    <p style="color:#374151;font-size:12px;text-align:center;margin-top:24px;">
      Quantum Daily · ${siteUrl}
    </p>
  </div>
</body>
</html>`;

  return sendEmail({
    to: email,
    subject: isZh ? "⚛ 欢迎订阅量子科技每日情报！" : "⚛ Welcome to Quantum Daily Intelligence!",
    html,
  });
}

/** Generate the main daily report email HTML */
function generateReportEmailHtml(
  report: Report,
  topArticles: Article[],
  locale: "en" | "zh",
  unsubscribeToken: string
): string {
  const isZh = locale === "zh";
  const siteUrl = "https://quantumnews-j6gvqm4g.manus.space";
  const unsubUrl = `${siteUrl}/unsubscribe?token=${unsubscribeToken}`;

  const title = isZh ? (report.titleZh || report.title) : report.title;
  const summary = isZh ? (report.summaryZh || report.summaryEn || "") : (report.summaryEn || "");

  const categoryLabels: Record<string, { en: string; zh: string; color: string }> = {
    quantum_computing: { en: "Quantum Computing", zh: "量子计算", color: "#6366f1" },
    quantum_communication: { en: "Quantum Communication", zh: "量子通信", color: "#06b6d4" },
    quantum_sensing: { en: "Quantum Sensing", zh: "量子传感", color: "#10b981" },
    quantum_cryptography: { en: "Quantum Cryptography", zh: "量子密码学", color: "#f59e0b" },
    general: { en: "General", zh: "综合", color: "#6b7280" },
  };

  const top5 = topArticles
    .sort((a, b) => (b.importanceScore || 0) - (a.importanceScore || 0))
    .slice(0, 8);

  const articlesHtml = top5.map((a, i) => {
    const cat = categoryLabels[a.category] || categoryLabels.general!;
    const articleTitle = isZh ? (a.titleZh || a.title) : a.title;
    const articleSummary = isZh ? (a.summaryZh || a.summaryEn || "") : (a.summaryEn || "");
    const score = (a.importanceScore || 5).toFixed(1);

    return `
    <div style="border-left:3px solid ${cat.color};padding:12px 16px;margin-bottom:16px;background:#0f1629;border-radius:0 8px 8px 0;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
        <span style="background:${cat.color}22;color:${cat.color};font-size:11px;padding:2px 8px;border-radius:4px;font-weight:600;">
          ${isZh ? cat.zh : cat.en}
        </span>
        <span style="color:#6b7280;font-size:11px;">${a.source}</span>
        <span style="color:#6b7280;font-size:11px;">★ ${score}/10</span>
      </div>
      <a href="${a.url}" style="color:#e2e8f0;font-size:14px;font-weight:600;text-decoration:none;line-height:1.4;display:block;margin-bottom:6px;">
        ${i + 1}. ${articleTitle}
      </a>
      <p style="color:#94a3b8;font-size:13px;margin:0;line-height:1.6;">${articleSummary}</p>
    </div>`;
  }).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#050810;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:28px;margin-bottom:6px;">⚛</div>
      <h1 style="color:#fff;font-size:22px;margin:0 0 4px;font-weight:700;">Quantum Daily</h1>
      <p style="color:#6366f1;font-size:13px;margin:0;">量子科技每日情报 · ${report.reportDate}</p>
    </div>

    <!-- Report Title -->
    <div style="background:linear-gradient(135deg,#1a1f3a,#0f1629);border:1px solid #2d3a5e;border-radius:12px;padding:24px;margin-bottom:20px;">
      <h2 style="color:#fff;font-size:18px;margin:0 0 12px;line-height:1.4;">${title}</h2>
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px;">
        <span style="color:#6366f1;font-size:13px;font-weight:600;">
          📊 ${report.articleCount} ${isZh ? "篇文章" : "articles"}
        </span>
        <span style="color:#6b7280;font-size:13px;">${report.reportDate}</span>
      </div>
      <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0;white-space:pre-line;">${summary.slice(0, 600)}${summary.length > 600 ? "…" : ""}</p>
    </div>

    <!-- Top Articles -->
    <h3 style="color:#e2e8f0;font-size:15px;font-weight:600;margin:0 0 16px;padding-bottom:8px;border-bottom:1px solid #1e2d4a;">
      🔥 ${isZh ? `今日头条 (Top ${top5.length})` : `Top Stories (${top5.length})`}
    </h3>
    ${articlesHtml}

    <!-- CTA Buttons -->
    <div style="text-align:center;margin:28px 0 20px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
      ${report.pdfUrl ? `
      <a href="${report.pdfUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
        📄 ${isZh ? "下载完整 PDF 报告" : "Download Full PDF Report"}
      </a>` : ""}
      <a href="${siteUrl}/reports" style="display:inline-block;background:#1e2d4a;color:#94a3b8;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;border:1px solid #2d3a5e;">
        ${isZh ? "查看历史报告" : "Browse Archive"} →
      </a>
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid #1e2d4a;padding-top:20px;text-align:center;">
      <p style="color:#374151;font-size:12px;margin:0 0 8px;">
        Quantum Daily · ${siteUrl}
      </p>
      <p style="color:#374151;font-size:11px;margin:0;">
        ${isZh ? "不想再收到邮件？" : "Don't want to receive these emails?"}
        <a href="${unsubUrl}" style="color:#6366f1;text-decoration:none;">
          ${isZh ? "一键取消订阅" : "Unsubscribe"}
        </a>
      </p>
    </div>

  </div>
</body>
</html>`;
}

/** Get subscriber stats */
export async function getSubscriberStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
}> {
  const db = await getDb();
  if (!db) return { total: 0, active: 0, inactive: 0 };

  const all = await db.select().from(emailSubscriptions);
  const active = all.filter((s) => s.active === "yes").length;
  return { total: all.length, active, inactive: all.length - active };
}
