import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import {
  Atom,
  FileText,
  Download,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Search,
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  formatReportDate,
  formatReportDateZh,
  STATUS_META,
} from "@/lib/quantum";

const PAGE_SIZE = 12;

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status as keyof typeof STATUS_META] ?? STATUS_META.pending;
  const icons = {
    pending: <Clock className="w-3 h-3" />,
    crawling: <Loader2 className="w-3 h-3 animate-spin" />,
    analyzing: <Loader2 className="w-3 h-3 animate-spin" />,
    generating: <Loader2 className="w-3 h-3 animate-spin" />,
    completed: <CheckCircle className="w-3 h-3" />,
    failed: <AlertCircle className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${meta.color}`}>
      {icons[status as keyof typeof icons] ?? icons.pending}
      {meta.label}
    </span>
  );
}

export default function Reports() {
  const [page, setPage] = useState(0);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchDate, setSearchDate] = useState("");

  const { data, isLoading } = trpc.reports.list.useQuery({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  const handleSearch = () => {
    setPage(0);
    if (searchDate) {
      setDateFrom(searchDate);
      setDateTo(searchDate);
    } else {
      setDateFrom("");
      setDateTo("");
    }
  };

  const handleClear = () => {
    setSearchDate("");
    setDateFrom("");
    setDateTo("");
    setPage(0);
  };

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
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" /> Home
            </Button>
          </Link>
        </div>
      </nav>

      <div className="container pt-28 pb-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-1">Report Archive</h1>
          <p className="text-muted-foreground">量子科技每日报告档案库</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8 p-4 rounded-xl border border-border/40 bg-card/30">
          <div className="flex items-center gap-2 flex-1">
            <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Input
              type="date"
              placeholder="Filter by date (YYYY-MM-DD)"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="bg-background/50 border-border/50 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSearch} size="sm" className="gap-1.5">
              <Search className="w-3.5 h-3.5" /> Filter
            </Button>
            {(dateFrom || dateTo) && (
              <Button onClick={handleClear} variant="outline" size="sm" className="border-border/50">
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Stats bar */}
        {data && (
          <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">{data.total}</strong> reports found
            </span>
            {(dateFrom || dateTo) && (
              <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                Filtered
              </Badge>
            )}
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 rounded-xl border border-border/40 bg-card/30 animate-pulse" />
            ))}
          </div>
        ) : data?.items.length === 0 ? (
          <div className="text-center py-20 rounded-xl border border-border/40 bg-card/20">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Reports Found</h3>
            <p className="text-sm text-muted-foreground">
              {dateFrom ? "No reports match the selected date filter." : "Reports will appear here after the first automated pipeline runs at UTC 00:00."}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.items.map((report) => {
              const statusMeta = STATUS_META[report.status as keyof typeof STATUS_META] ?? STATUS_META.pending;
              return (
                <Link key={report.id} href={`/reports/${report.id}`} className="no-underline group">
                  <div className="h-full p-5 rounded-xl border border-border/40 bg-card/30 hover:border-primary/30 hover:bg-card/60 transition-all duration-200 cursor-pointer">
                    {/* Date & Status */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-xs text-primary font-medium">
                          {formatReportDate(report.reportDate)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatReportDateZh(report.reportDate)}
                        </div>
                      </div>
                      <StatusBadge status={report.status} />
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-semibold text-foreground leading-snug mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                      {report.title}
                    </h3>
                    {report.titleZh && (
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-1">{report.titleZh}</p>
                    )}

                    {/* Summary snippet */}
                    {report.summaryEn && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                        {report.summaryEn}
                      </p>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/30">
                      <span className="text-xs text-muted-foreground">
                        {report.articleCount} articles
                      </span>
                      {report.pdfUrl && report.status === "completed" && (
                        <a
                          href={report.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors no-underline"
                        >
                          <Download className="w-3 h-3" /> PDF
                        </a>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="border-border/50 gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="border-border/50 gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
