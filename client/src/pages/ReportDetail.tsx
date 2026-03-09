import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useParams } from "wouter";
import {
  Atom,
  Download,
  ArrowLeft,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Star,
  Filter,
} from "lucide-react";
import {
  CATEGORY_META,
  formatReportDate,
  formatReportDateZh,
  getScoreColor,
  getScoreLabel,
  type QuantumCategory,
} from "@/lib/quantum";

const ALL_CATEGORIES = [
  "all",
  "quantum_computing",
  "quantum_communication",
  "quantum_sensing",
  "quantum_cryptography",
  "general",
] as const;

function ArticleCard({
  article,
}: {
  article: {
    id: number;
    title: string;
    titleZh: string | null;
    url: string;
    source: string;
    category: string;
    summaryEn: string | null;
    summaryZh: string | null;
    importanceScore: number | null;
    authors: string | null;
    publishedAt: Date | null;
  };
}) {
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORY_META[article.category as QuantumCategory] ?? CATEGORY_META.general;
  const score = article.importanceScore ?? 5;

  return (
    <div className="rounded-xl border border-border/40 bg-card/30 overflow-hidden hover:border-border/60 transition-all">
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cat.cssClass}`}>
              {cat.icon} {cat.zh}
            </span>
            <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full border border-border/30">
              {article.source}
            </span>
            {article.publishedAt && (
              <span className="text-xs text-muted-foreground">
                {new Date(article.publishedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
          <div className={`flex items-center gap-1 text-xs font-bold flex-shrink-0 ${getScoreColor(score)}`}>
            <Star className="w-3 h-3 fill-current" />
            {score.toFixed(1)}
            <span className="font-normal text-muted-foreground">({getScoreLabel(score)})</span>
          </div>
        </div>

        {/* Titles */}
        <h3 className="text-sm font-semibold text-foreground leading-snug mb-1">
          {article.title}
        </h3>
        {article.titleZh && (
          <p className="text-xs text-primary/80 mb-2">{article.titleZh}</p>
        )}
        {article.authors && (
          <p className="text-xs text-muted-foreground italic mb-3">
            {article.authors.slice(0, 120)}{article.authors.length > 120 ? "..." : ""}
          </p>
        )}

        {/* Summaries */}
        <div className={`grid gap-3 ${expanded ? "" : "hidden"} md:grid`}>
          <div className="grid md:grid-cols-2 gap-3">
            {article.summaryEn && (
              <div className="p-3 rounded-lg bg-background/50 border border-border/30">
                <div className="text-xs font-bold text-primary/60 uppercase tracking-wider mb-1.5">EN</div>
                <p className="text-xs text-muted-foreground leading-relaxed">{article.summaryEn}</p>
              </div>
            )}
            {article.summaryZh && (
              <div className="p-3 rounded-lg bg-background/50 border border-border/30">
                <div className="text-xs font-bold text-primary/60 uppercase tracking-wider mb-1.5">中</div>
                <p className="text-xs text-muted-foreground leading-relaxed">{article.summaryZh}</p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile expand toggle */}
        <div className="md:hidden mt-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-primary flex items-center gap-1"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "Hide summary" : "Show summary"}
          </button>
        </div>

        {/* Link */}
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors no-underline"
        >
          <ExternalLink className="w-3 h-3" />
          Read original article
        </a>
      </div>
    </div>
  );
}

export default function ReportDetail() {
  const params = useParams<{ id: string }>();
  const reportId = parseInt(params.id ?? "0");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"score" | "source">("score");

  const { data: report, isLoading } = trpc.reports.byId.useQuery(
    { id: reportId },
    { enabled: !!reportId }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Atom className="w-10 h-10 text-primary mx-auto mb-3 animate-spin" />
          <p className="text-muted-foreground text-sm">Loading report...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Report not found</p>
          <Link href="/reports">
            <Button variant="outline" size="sm">Back to Reports</Button>
          </Link>
        </div>
      </div>
    );
  }

  const articles = report.articles ?? [];
  const filtered = articles
    .filter((a) => categoryFilter === "all" || a.category === categoryFilter)
    .sort((a, b) => {
      if (sortBy === "score") return (b.importanceScore ?? 5) - (a.importanceScore ?? 5);
      return a.source.localeCompare(b.source);
    });

  const categoryCounts = articles.reduce(
    (acc, a) => { acc[a.category] = (acc[a.category] || 0) + 1; return acc; },
    {} as Record<string, number>
  );

  const highImpact = articles.filter((a) => (a.importanceScore ?? 5) >= 7).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 no-underline">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Atom className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-foreground tracking-tight">Quantum Daily</span>
          </Link>
          <Link href="/reports">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" /> All Reports
            </Button>
          </Link>
        </div>
      </nav>

      <div className="container pt-28 pb-16">
        {/* Report header */}
        <div className="mb-8 p-6 rounded-xl border border-primary/20 bg-primary/5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs text-primary font-medium uppercase tracking-wider mb-2">
                {formatReportDate(report.reportDate)} · {formatReportDateZh(report.reportDate)}
              </div>
              <h1 className="text-2xl font-bold text-foreground leading-tight mb-1">
                {report.title}
              </h1>
              {report.titleZh && (
                <p className="text-base text-primary/80">{report.titleZh}</p>
              )}
            </div>
            {report.pdfUrl && (
              <a href={report.pdfUrl} target="_blank" rel="noopener noreferrer">
                <Button className="gap-2 flex-shrink-0">
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>
              </a>
            )}
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-3 mt-4">
            <Badge variant="outline" className="border-border/50 text-muted-foreground">
              {report.articleCount} total articles
            </Badge>
            <Badge variant="outline" className="border-red-500/30 text-red-400">
              {highImpact} high impact
            </Badge>
            {Object.entries(categoryCounts).map(([cat, count]) => {
              const meta = CATEGORY_META[cat as QuantumCategory] ?? CATEGORY_META.general;
              return (
                <Badge key={cat} variant="outline" className={`border-current/30 text-xs ${meta.cssClass}`}>
                  {meta.icon} {meta.zh}: {count}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Executive Summary */}
        {(report.summaryEn || report.summaryZh) && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-foreground mb-4">Executive Summary / 执行摘要</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {report.summaryEn && (
                <div className="p-5 rounded-xl border border-border/40 bg-card/30">
                  <div className="text-xs font-bold text-primary/60 uppercase tracking-wider mb-3">
                    English Summary
                  </div>
                  <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {report.summaryEn}
                  </div>
                </div>
              )}
              {report.summaryZh && (
                <div className="p-5 rounded-xl border border-border/40 bg-card/30">
                  <div className="text-xs font-bold text-primary/60 uppercase tracking-wider mb-3">
                    中文摘要
                  </div>
                  <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {report.summaryZh}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Article filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          <h2 className="text-lg font-bold text-foreground">
            Articles ({filtered.length})
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <div className="flex gap-1.5 flex-wrap">
              {ALL_CATEGORIES.map((cat) => {
                const meta = cat === "all" ? null : CATEGORY_META[cat as QuantumCategory];
                const count = cat === "all" ? articles.length : (categoryCounts[cat] ?? 0);
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                      categoryFilter === cat
                        ? "bg-primary/20 border-primary/40 text-primary"
                        : "border-border/40 text-muted-foreground hover:border-border/70"
                    }`}
                  >
                    {meta ? `${meta.icon} ${meta.zh}` : "All"} ({count})
                  </button>
                );
              })}
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "score" | "source")}
              className="text-xs bg-card border border-border/40 rounded-lg px-2 py-1 text-muted-foreground"
            >
              <option value="score">Sort: Importance</option>
              <option value="source">Sort: Source</option>
            </select>
          </div>
        </div>

        {/* Articles grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-border/40 bg-card/20">
            <p className="text-muted-foreground text-sm">No articles in this category</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-4">
            {filtered.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
