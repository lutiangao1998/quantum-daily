import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Play, RefreshCw, CheckCircle2, XCircle, Clock, Loader2,
  Zap, Globe, FileText, Copy, ExternalLink, Terminal,
  MessageSquare, Webhook, Shield, BookOpen, ChevronRight,
  Activity, Database, AlertCircle, Cpu, DollarSign, TrendingDown
} from "lucide-react";

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge variant="outline" className="text-slate-400">Not started</Badge>;
  const map: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    completed: { label: "Completed", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: <CheckCircle2 className="w-3 h-3" /> },
    failed: { label: "Failed", className: "bg-red-500/20 text-red-400 border-red-500/30", icon: <XCircle className="w-3 h-3" /> },
    crawling: { label: "Crawling…", className: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    analyzing: { label: "Analyzing…", className: "bg-violet-500/20 text-violet-400 border-violet-500/30", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    generating: { label: "Generating PDF…", className: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    pending: { label: "Pending", className: "bg-slate-500/20 text-slate-400 border-slate-500/30", icon: <Clock className="w-3 h-3" /> },
  };
  const cfg = map[status] ?? { label: status, className: "bg-slate-500/20 text-slate-400", icon: null };
  return (
    <Badge className={`flex items-center gap-1 ${cfg.className}`}>
      {cfg.icon}{cfg.label}
    </Badge>
  );
}

function CodeBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group">
      <pre className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-sm text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap break-all">
        {children}
      </pre>
      <button
        onClick={copy}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-700 hover:bg-slate-600 text-slate-300 rounded px-2 py-1 text-xs flex items-center gap-1"
      >
        <Copy className="w-3 h-3" />
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

export default function Admin() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [todayDate] = useState(() => new Date().toISOString().split("T")[0]!);
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [siteUrl] = useState(() => window.location.origin);

  // Redirect non-admins
  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== "admin")) {
      navigate("/");
    }
  }, [loading, isAuthenticated, user, navigate]);

  const todayStatus = trpc.reports.status.useQuery(
    { date: todayDate },
    { refetchInterval: pollingEnabled ? 3000 : false }
  );

  const recentReports = trpc.reports.list.useQuery({ limit: 5, offset: 0 });
  const llmStatus = trpc.llm.status.useQuery();

  const triggerMutation = trpc.reports.triggerGeneration.useMutation({
    onSuccess: (data) => {
      toast.success(`Pipeline started for ${data.date}`, {
        description: "This takes 3–5 minutes. Status will auto-refresh.",
      });
      setPollingEnabled(true);
      todayStatus.refetch();
    },
    onError: (err) => {
      toast.error("Failed to trigger pipeline", { description: err.message });
    },
  });

  const handleTrigger = () => {
    triggerMutation.mutate({ date: todayDate });
  };

  // Stop polling when done
  useEffect(() => {
    const s = todayStatus.data?.status;
    if (s === "completed" || s === "failed") {
      setPollingEnabled(false);
    }
  }, [todayStatus.data?.status]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050810]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  const webhookUrl = `${siteUrl}/api/webhook/trigger`;
  const latestUrl = `${siteUrl}/api/webhook/latest`;
  const pingUrl = `${siteUrl}/api/webhook/ping`;

  return (
    <div className="min-h-screen bg-[#050810] text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1">
              ⚛ Quantum Daily
            </button>
            <ChevronRight className="w-4 h-4 text-slate-600" />
            <span className="text-white font-semibold">Admin Panel</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-400">{user?.name ?? "Admin"}</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* ── Today's Pipeline ── */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            Today's Pipeline — {todayDate}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-900 border-slate-700 md:col-span-2">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <StatusBadge status={todayStatus.data?.status ?? null} />
                      {pollingEnabled && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 animate-spin" /> Auto-refreshing
                        </span>
                      )}
                    </div>
                    {todayStatus.data?.articleCount != null && todayStatus.data.articleCount > 0 && (
                      <p className="text-sm text-slate-400 mt-1">
                        {todayStatus.data.articleCount} articles collected
                      </p>
                    )}
                    {todayStatus.data?.errorMessage && (
                      <p className="text-sm text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {todayStatus.data.errorMessage}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={handleTrigger}
                    disabled={
                      triggerMutation.isPending ||
                      todayStatus.data?.status === "crawling" ||
                      todayStatus.data?.status === "analyzing" ||
                      todayStatus.data?.status === "generating"
                    }
                    className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
                  >
                    {triggerMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Starting…</>
                    ) : (
                      <><Play className="w-4 h-4" /> Run Now</>
                    )}
                  </Button>
                </div>

                {/* Pipeline stages */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: "crawling", label: "Crawl", icon: <Globe className="w-4 h-4" /> },
                    { key: "analyzing", label: "AI Analysis", icon: <Zap className="w-4 h-4" /> },
                    { key: "generating", label: "PDF Gen", icon: <FileText className="w-4 h-4" /> },
                    { key: "completed", label: "Done", icon: <CheckCircle2 className="w-4 h-4" /> },
                  ].map((stage) => {
                    const current = todayStatus.data?.status;
                    const stageOrder = ["crawling", "analyzing", "generating", "completed"];
                    const stageIdx = stageOrder.indexOf(stage.key);
                    const currentIdx = current ? stageOrder.indexOf(current) : -1;
                    const isDone = currentIdx > stageIdx || (current === "completed" && stage.key === "completed");
                    const isActive = current === stage.key;
                    return (
                      <div
                        key={stage.key}
                        className={`rounded-lg p-3 text-center border transition-all ${
                          isDone
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : isActive
                              ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                              : "bg-slate-800/50 border-slate-700 text-slate-500"
                        }`}
                      >
                        <div className="flex justify-center mb-1">
                          {isActive ? <Loader2 className="w-4 h-4 animate-spin" /> : stage.icon}
                        </div>
                        <div className="text-xs font-medium">{stage.label}</div>
                      </div>
                    );
                  })}
                </div>

                {todayStatus.data?.pdfUrl && (
                  <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between">
                    <span className="text-sm text-emerald-400 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> PDF Report Ready
                    </span>
                    <a
                      href={todayStatus.data.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      Download <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-400" />
                  Recent Reports
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentReports.isLoading ? (
                  <div className="text-slate-500 text-sm">Loading…</div>
                ) : recentReports.data?.items.length === 0 ? (
                  <div className="text-slate-500 text-sm">No reports yet</div>
                ) : (
                  recentReports.data?.items.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => navigate(`/reports/${r.id}`)}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 transition-colors text-left"
                    >
                      <span className="text-xs text-slate-300">{r.reportDate}</span>
                      <StatusBadge status={r.status} />
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator className="bg-slate-800" />

        {/* ── OpenClaw Integration Guide ── */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            OpenClaw Integration
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            Connect OpenClaw to this platform so you can query quantum intelligence reports directly via WhatsApp or Telegram — with <strong className="text-white">zero extra Manus token cost</strong>. OpenClaw reads the pre-generated JSON from this server; no LLM is invoked per query.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Step 1: Install */}
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  Step 1 — Install OpenClaw
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Run on your own machine or VPS. Node 22+ required.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <CodeBlock>{`npm install -g openclaw@latest
openclaw onboard --install-daemon
openclaw channels login`}</CodeBlock>
                <p className="text-xs text-slate-500">
                  Follow the on-screen prompts to connect WhatsApp or Telegram.
                  Full docs: <a href="https://docs.openclaw.ai" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">docs.openclaw.ai</a>
                </p>
              </CardContent>
            </Card>

            {/* Step 2: Install Skill */}
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  Step 2 — Install the Quantum Skill
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Copy the skill file into your OpenClaw workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <CodeBlock>{`mkdir -p ~/.openclaw/workspace/skills/quantum-daily
# Then copy the SKILL.md from the Code panel
# (openclaw-skill/SKILL.md in this project)`}</CodeBlock>
                <p className="text-xs text-slate-500">
                  The skill is in the <strong className="text-slate-300">Code panel → openclaw-skill/SKILL.md</strong>. Download it and place it in the skills directory above.
                </p>
              </CardContent>
            </Card>

            {/* Step 3: Configure env */}
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  Step 3 — Configure Environment
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Set your site URL and webhook secret in OpenClaw config.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <CodeBlock>{`# ~/.openclaw/openclaw.json
{
  "skills": {
    "entries": {
      "quantum-daily": {
        "enabled": true,
        "env": {
          "QUANTUM_DAILY_URL": "${siteUrl}",
          "QUANTUM_WEBHOOK_SECRET": "YOUR_SECRET_HERE"
        }
      }
    }
  }
}`}</CodeBlock>
                <p className="text-xs text-slate-500">
                  Replace <code className="text-indigo-300">YOUR_SECRET_HERE</code> with the WEBHOOK_SECRET you set in Manus Secrets panel.
                </p>
              </CardContent>
            </Card>

            {/* Step 4: Schedule */}
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-white flex items-center gap-2">
                  <Webhook className="w-4 h-4 text-indigo-400" />
                  Step 4 — Auto-Trigger Daily (Optional)
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  The platform already has a built-in UTC 00:05 scheduler. Optionally also trigger from OpenClaw.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <CodeBlock>{`# Send this message to your OpenClaw bot:
"量子日报触发今天的报告生成"
# or
"trigger quantum daily report for today"

# Or call the webhook directly from cron:
curl -X POST "${webhookUrl}" \\
  -H "X-Webhook-Secret: YOUR_SECRET" \\
  -H "Content-Type: application/json"`}</CodeBlock>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator className="bg-slate-800" />

        {/* ── API Endpoints ── */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-400" />
            API Endpoints
          </h2>
          <div className="space-y-3">
            {[
              {
                method: "GET",
                path: "/api/webhook/ping",
                url: pingUrl,
                desc: "Health check — verify the service is reachable",
                auth: false,
              },
              {
                method: "GET",
                path: "/api/webhook/latest",
                url: latestUrl,
                desc: "Latest completed report (compact JSON, optimised for OpenClaw)",
                auth: false,
              },
              {
                method: "GET",
                path: "/api/webhook/status?date=YYYY-MM-DD",
                url: `${siteUrl}/api/webhook/status?date=${todayDate}`,
                desc: "Pipeline status for a specific date",
                auth: false,
              },
              {
                method: "POST",
                path: "/api/webhook/trigger",
                url: webhookUrl,
                desc: "Trigger report generation (requires X-Webhook-Secret header)",
                auth: true,
              },
            ].map((ep) => (
              <div
                key={ep.path}
                className="flex items-start gap-4 p-4 bg-slate-900 border border-slate-700 rounded-lg"
              >
                <Badge
                  className={`shrink-0 font-mono text-xs ${
                    ep.method === "POST"
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  }`}
                >
                  {ep.method}
                </Badge>
                <div className="flex-1 min-w-0">
                  <code className="text-sm text-indigo-300 font-mono">{ep.path}</code>
                  <p className="text-xs text-slate-400 mt-1">{ep.desc}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {ep.auth && (
                    <Badge className="bg-slate-700 text-slate-300 border-slate-600 text-xs">
                      <Shield className="w-3 h-3 mr-1" />Auth
                    </Badge>
                  )}
                  {ep.method === "GET" && (
                    <a
                      href={ep.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── LLM Provider Status ── */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            AI Analysis Engine
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Active Provider */}
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-slate-400 uppercase tracking-wider">Active Provider</CardTitle>
              </CardHeader>
              <CardContent>
                {llmStatus.isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${
                        llmStatus.data?.activeProvider === 'deepseek' ? 'bg-blue-400' :
                        llmStatus.data?.activeProvider === 'openai' ? 'bg-green-400' : 'bg-slate-400'
                      } animate-pulse`} />
                      <span className="text-white font-semibold text-sm">{llmStatus.data?.activeLabel}</span>
                    </div>
                    <div className="space-y-1 text-xs text-slate-400">
                      <div className="flex justify-between">
                        <span>DeepSeek</span>
                        <Badge className={`text-xs ${llmStatus.data?.hasDeepseek ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-slate-700 text-slate-500 border-slate-600'}`}>
                          {llmStatus.data?.hasDeepseek ? '✓ Configured' : 'Not set'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>OpenAI</span>
                        <Badge className={`text-xs ${llmStatus.data?.hasOpenai ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-slate-700 text-slate-500 border-slate-600'}`}>
                          {llmStatus.data?.hasOpenai ? '✓ Configured' : 'Not set'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Manus (fallback)</span>
                        <Badge className="text-xs bg-slate-600/30 text-slate-400 border-slate-600">✓ Always on</Badge>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Cost per report */}
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-slate-400 uppercase tracking-wider">Est. Cost / Daily Report</CardTitle>
              </CardHeader>
              <CardContent>
                {llmStatus.data?.estimatedDailyCostUSD != null ? (
                  <>
                    <div className="flex items-end gap-1 mb-1">
                      <span className="text-3xl font-bold text-emerald-400">
                        ${(llmStatus.data.estimatedDailyCostUSD * 100).toFixed(3)}¢
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">per day (~55 articles)</p>
                    <p className="text-xs text-slate-500 mt-2">
                      ~${(llmStatus.data.estimatedDailyCostUSD * 365).toFixed(2)} / year
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-slate-400 mb-1">Manus Credits</div>
                    <p className="text-xs text-slate-500">Add DeepSeek key to switch to paid API (much cheaper)</p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Cost comparison */}
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> Cost Comparison
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: 'DeepSeek Chat', costPerDay: 0.0062, color: 'text-blue-400', active: llmStatus.data?.activeProvider === 'deepseek' },
                  { label: 'GPT-4o Mini', costPerDay: 0.0099, color: 'text-green-400', active: llmStatus.data?.activeProvider === 'openai' },
                  { label: 'GPT-4o', costPerDay: 0.198, color: 'text-yellow-400', active: false },
                  { label: 'Manus Credits', costPerDay: null, color: 'text-slate-400', active: llmStatus.data?.activeProvider === 'manus' },
                ].map(item => (
                  <div key={item.label} className={`flex items-center justify-between text-xs p-1.5 rounded ${
                    item.active ? 'bg-indigo-500/10 border border-indigo-500/20' : ''
                  }`}>
                    <span className={item.color}>{item.label}{item.active ? ' ←' : ''}</span>
                    <span className="text-slate-400 font-mono">
                      {item.costPerDay != null ? `$${item.costPerDay.toFixed(4)}/day` : 'credits'}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator className="bg-slate-800" />

        {/* ── Token Saving Explanation ── */}
        <section>
          <Card className="bg-gradient-to-br from-indigo-950/50 to-slate-900 border-indigo-800/40">
            <CardContent className="pt-6">
              <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                How This Saves Manus Tokens
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                  <p className="text-slate-300 font-medium mb-2">Without OpenClaw (old way)</p>
                  <ul className="space-y-1 text-slate-400 text-xs">
                    <li>• Every query to Manus invokes an LLM call</li>
                    <li>• Each "what's the quantum news?" costs tokens</li>
                    <li>• Repeated queries multiply token usage</li>
                  </ul>
                </div>
                <div>
                  <p className="text-slate-300 font-medium mb-2">With DeepSeek + OpenClaw (new way)</p>
                  <ul className="space-y-1 text-slate-400 text-xs">
                    <li>✅ AI analysis uses <strong className="text-white">DeepSeek</strong> — not Manus credits</li>
                    <li>✅ OpenClaw reads pre-generated JSON — <strong className="text-white">zero LLM per query</strong></li>
                    <li>✅ AI analysis runs <strong className="text-white">once per day</strong> at ~$0.006</li>
                    <li>✅ Unlimited WhatsApp/Telegram queries at no extra cost</li>
                    <li>✅ Manus only used as emergency fallback</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

      </div>
    </div>
  );
}
