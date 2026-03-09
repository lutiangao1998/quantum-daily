import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  Atom,
  FileText,
  Globe,
  Zap,
  Clock,
  Brain,
  Download,
  ArrowRight,
  TrendingUp,
  Shield,
  Radio,
  Microscope,
  ChevronRight,
} from "lucide-react";
import {
  CATEGORY_META,
  formatReportDate,
  formatReportDateZh,
  getScoreColor,
  STATUS_META,
} from "@/lib/quantum";

const FEATURES = [
  {
    icon: Globe,
    title: "Global Intelligence Crawling",
    titleZh: "全球情报抓取",
    desc: "Automatically collects from arXiv, Nature, Reuters, IEEE, Phys.org and more every day at UTC 00:00.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    titleZh: "AI 智能分析",
    desc: "Advanced LLM categorizes, scores importance (0-10), and generates bilingual summaries for every article.",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
  },
  {
    icon: FileText,
    title: "Beautiful PDF Reports",
    titleZh: "精美 PDF 报告",
    desc: "Professionally formatted daily intelligence reports with bilingual content, charts, and direct source links.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  {
    icon: Zap,
    title: "OpenClaw Integration",
    titleZh: "OpenClaw 集成",
    desc: "Query the latest quantum intelligence directly via WhatsApp or Telegram using the OpenClaw Skill.",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
];

const CATEGORIES = [
  { key: "quantum_computing", icon: Atom, color: "text-violet-400" },
  { key: "quantum_communication", icon: Radio, color: "text-sky-400" },
  { key: "quantum_sensing", icon: Microscope, color: "text-emerald-400" },
  { key: "quantum_cryptography", icon: Shield, color: "text-amber-400" },
] as const;

function NavBar() {
  const { isAuthenticated, user, logout } = useAuth();
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="container flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Atom className="w-4 h-4 text-primary" />
          </div>
          <span className="font-bold text-foreground tracking-tight">
            Quantum Daily
          </span>
          <Badge variant="outline" className="text-xs border-primary/30 text-primary hidden sm:flex">
            BETA
          </Badge>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/reports" className="text-sm text-muted-foreground hover:text-foreground transition-colors no-underline">
            Reports
          </Link>
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:block">{user?.name}</span>
              <Button variant="outline" size="sm" onClick={logout} className="border-border/50">
                Logout
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}

function HeroSection() {
  const { data: latest } = trpc.reports.latest.useQuery();

  return (
    <section className="relative pt-32 pb-20 overflow-hidden quantum-grid">
      {/* Radial glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="container relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Automated Daily Intelligence · UTC 00:00 Pipeline
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-4">
            Quantum Technology
            <br />
            <span className="text-primary">Daily Intelligence</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-2">量子科技每日情报平台</p>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            AI-powered platform that automatically crawls global quantum news, research papers, and financial reports from arXiv, Nature, Reuters and more — generating bilingual PDF intelligence reports every day.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/reports">
              <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8">
                <FileText className="w-4 h-4" />
                Browse Reports
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            {latest?.pdfUrl && (
              <a href={latest.pdfUrl} target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="gap-2 border-border/50">
                  <Download className="w-4 h-4" />
                  Latest PDF Report
                </Button>
              </a>
            )}
          </div>

          {latest && (
            <div className="mt-8 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              Latest report: {formatReportDate(latest.reportDate)} · {latest.articleCount} articles
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  const { data: reportsData } = trpc.reports.list.useQuery({ limit: 100 });
  const total = reportsData?.total ?? 0;
  const totalArticles = reportsData?.items.reduce((s, r) => s + r.articleCount, 0) ?? 0;

  const stats = [
    { label: "Reports Generated", labelZh: "已生成报告", value: total.toString(), icon: FileText },
    { label: "Articles Analyzed", labelZh: "已分析文章", value: totalArticles.toLocaleString(), icon: TrendingUp },
    { label: "Data Sources", labelZh: "数据来源", value: "6+", icon: Globe },
    { label: "Quantum Categories", labelZh: "量子分类", value: "4", icon: Atom },
  ];

  return (
    <section className="py-16 border-y border-border/30">
      <div className="container">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">{stat.value}</div>
              <div className="text-sm font-medium text-foreground">{stat.label}</div>
              <div className="text-xs text-muted-foreground">{stat.labelZh}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="py-20">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-2">Platform Features</h2>
          <p className="text-muted-foreground">平台核心功能</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="p-5 rounded-xl border border-border/40 bg-card/50 hover:border-primary/30 hover:bg-card transition-all duration-200"
            >
              <div className={`w-10 h-10 rounded-lg ${f.bg} flex items-center justify-center mb-4`}>
                <f.icon className={`w-5 h-5 ${f.color}`} />
              </div>
              <h3 className="font-semibold text-foreground text-sm mb-1">{f.title}</h3>
              <p className="text-xs text-muted-foreground mb-1">{f.titleZh}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoriesSection() {
  return (
    <section className="py-16 bg-card/20 border-y border-border/30">
      <div className="container">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-foreground mb-2">Coverage Areas</h2>
          <p className="text-muted-foreground">覆盖量子科技四大领域</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORIES.map(({ key, icon: Icon, color }) => {
            const meta = CATEGORY_META[key];
            return (
              <div
                key={key}
                className="p-5 rounded-xl border border-border/40 bg-background/50 hover:border-primary/20 transition-all"
              >
                <Icon className={`w-8 h-8 ${color} mb-3`} />
                <div className="font-semibold text-foreground text-sm">{meta.en}</div>
                <div className="text-xs text-muted-foreground">{meta.zh}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function LatestReportSection() {
  const { data: latest, isLoading } = trpc.reports.latest.useQuery();

  if (isLoading) {
    return (
      <section className="py-20">
        <div className="container">
          <div className="h-48 rounded-xl border border-border/40 bg-card/30 animate-pulse" />
        </div>
      </section>
    );
  }

  if (!latest) {
    return (
      <section className="py-20">
        <div className="container">
          <div className="text-center py-16 rounded-xl border border-border/40 bg-card/20">
            <Atom className="w-12 h-12 text-muted-foreground mx-auto mb-4 animate-pulse-glow" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Reports Yet</h3>
            <p className="text-sm text-muted-foreground">
              The first report will be automatically generated at UTC 00:00.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              首份报告将在 UTC 00:00 自动生成
            </p>
          </div>
        </div>
      </section>
    );
  }

  const topArticles = latest.articles?.slice(0, 3) ?? [];

  return (
    <section className="py-20">
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Latest Report</h2>
            <p className="text-muted-foreground text-sm">最新每日报告</p>
          </div>
          <Link href="/reports">
            <Button variant="outline" size="sm" className="gap-1 border-border/50">
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        <div className="rounded-xl border border-border/40 bg-card/30 overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-border/30 bg-primary/5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="text-xs text-primary font-medium mb-1 uppercase tracking-wider">
                  {formatReportDate(latest.reportDate)} · {formatReportDateZh(latest.reportDate)}
                </div>
                <h3 className="text-lg font-bold text-foreground leading-tight">{latest.title}</h3>
                {latest.titleZh && (
                  <p className="text-sm text-primary/80 mt-0.5">{latest.titleZh}</p>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                  {latest.articleCount} articles
                </Badge>
                {latest.pdfUrl && (
                  <a href={latest.pdfUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="gap-1.5">
                      <Download className="w-3.5 h-3.5" />
                      PDF
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Summary */}
          {latest.summaryEn && (
            <div className="p-6 border-b border-border/30">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-bold text-primary/70 uppercase tracking-wider mb-2">EN Summary</div>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">{latest.summaryEn}</p>
                </div>
                {latest.summaryZh && (
                  <div>
                    <div className="text-xs font-bold text-primary/70 uppercase tracking-wider mb-2">中文摘要</div>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">{latest.summaryZh}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Top articles */}
          {topArticles.length > 0 && (
            <div className="p-6">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Top Articles
              </div>
              <div className="space-y-3">
                {topArticles.map((article) => {
                  const cat = CATEGORY_META[article.category as keyof typeof CATEGORY_META] ?? CATEGORY_META.general;
                  return (
                    <div key={article.id} className="flex items-start gap-3">
                      <div className={`text-xs font-bold mt-0.5 ${getScoreColor(article.importanceScore ?? 5)}`}>
                        {(article.importanceScore ?? 5).toFixed(1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-foreground hover:text-primary transition-colors line-clamp-1 no-underline"
                        >
                          {article.title}
                        </a>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded border ${cat.cssClass}`}>
                            {cat.zh}
                          </span>
                          <span className="text-xs text-muted-foreground">{article.source}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Link href={`/reports/${latest.id}`}>
                <Button variant="ghost" size="sm" className="mt-4 gap-1 text-primary hover:text-primary">
                  View Full Report <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function OpenClawSection() {
  return (
    <section className="py-20 bg-card/20 border-t border-border/30">
      <div className="container">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-8">
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-1">OpenClaw Integration</h2>
                <p className="text-sm text-primary/80 mb-4">通过 WhatsApp / Telegram 查询量子资讯</p>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Install the <strong className="text-foreground">Quantum Daily Skill</strong> in your OpenClaw assistant to query the latest quantum intelligence reports directly from WhatsApp or Telegram. Ask for summaries, top articles, or download links — all from your favorite chat app.
                </p>
                <div className="bg-background/50 rounded-lg border border-border/40 p-4 font-mono text-xs text-muted-foreground space-y-1">
                  <div><span className="text-primary">You:</span> What's today's quantum news?</div>
                  <div><span className="text-emerald-400">Claw:</span> Today's Quantum Daily report covers 47 articles...</div>
                  <div><span className="text-primary">You:</span> 今天有什么量子计算突破？</div>
                  <div><span className="text-emerald-400">Claw:</span> 今日量子计算领域有 3 篇高影响力论文...</div>
                </div>
                <div className="mt-4 text-xs text-muted-foreground">
                  📦 Skill file available in the project — see <code className="text-primary">openclaw-skill/SKILL.md</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-10 border-t border-border/30">
      <div className="container text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Atom className="w-4 h-4 text-primary" />
          <span className="font-semibold text-foreground text-sm">Quantum Daily</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Automated quantum intelligence platform · Powered by AI × OpenClaw
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          量子科技每日情报平台 · 由 AI × OpenClaw 驱动
        </p>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <CategoriesSection />
      <LatestReportSection />
      <OpenClawSection />
      <Footer />
    </div>
  );
}
