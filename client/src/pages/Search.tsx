import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Search as SearchIcon, ExternalLink } from "lucide-react";
import { getCategoryColor, getCategoryLabel } from "@/lib/quantum";

export default function Search() {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(0);
  const limit = 20;

  // Fetch categories
  const { data: categoriesData } = trpc.search.categories.useQuery();
  const categories = useMemo(
    () => [
      { value: "all", label: "All Categories" },
      ...(categoriesData || []),
    ],
    [categoriesData]
  );

  // Search articles
  const { data: searchData, isLoading } = trpc.search.articles.useQuery(
    {
      keyword: keyword.trim(),
      category: category === "all" ? undefined : category,
      limit,
      offset: page * limit,
    },
    {
      enabled: keyword.trim().length > 0,
    }
  );

  const results = searchData?.results || [];
  const total = searchData?.total || 0;
  const hasMore = searchData?.hasMore || false;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pt-20 pb-12">
      <div className="container max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Search Quantum News</h1>
          <p className="text-slate-400">Find articles across our quantum intelligence archive</p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8 space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-3 text-slate-500" size={20} />
              <Input
                placeholder="Search by keyword (error correction, quantum computing, etc.)"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              Search
            </Button>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Button
                key={cat.value}
                type="button"
                variant={category === cat.value ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setCategory(cat.value);
                  setPage(0);
                }}
                className={
                  category === cat.value
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "border-slate-700 text-slate-300 hover:bg-slate-800"
                }
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </form>

        {/* Results */}
        {keyword.trim().length === 0 ? (
          <Card className="p-8 text-center border-slate-700 bg-slate-800/50">
            <SearchIcon className="mx-auto mb-4 text-slate-500" size={48} />
            <p className="text-slate-400">Enter a keyword to search our archive</p>
          </Card>
        ) : isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-24 bg-gradient-to-r from-slate-800 to-slate-900 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : results.length === 0 ? (
          <Card className="p-8 text-center border-slate-700 bg-slate-800/50">
            <p className="text-slate-400">No articles found matching "{keyword}"</p>
          </Card>
        ) : (
          <>
            {/* Result Count */}
            <div className="mb-4 text-sm text-slate-400">
              Found {total} result{total !== 1 ? "s" : ""} {total > 0 && `(showing ${page * limit + 1}-${Math.min((page + 1) * limit, total)})`}
            </div>

            {/* Results List */}
            <div className="space-y-4 mb-8">
              {results.map((article) => (
                <Card
                  key={article.id}
                  className="p-6 border-slate-700 bg-slate-800/50 hover:bg-slate-800 transition-colors"
                >
                  <div className="space-y-3">
                    {/* Title */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">{article.title}</h3>
                      <p className="text-sm text-slate-400">{article.titleZh}</p>
                    </div>

                    {/* Summary */}
                    <p className="text-slate-300 text-sm line-clamp-2">{article.summaryEn}</p>

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <Badge
                        variant="outline"
                        className={`${getCategoryColor(article.category)} border-0`}
                      >
                        {getCategoryLabel(article.category)}
                      </Badge>
                      <span>Score: {article.importanceScore}/10</span>
                      <span>{article.source}</span>
                      <span>{new Date(article.reportDate).toLocaleDateString()}</span>
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        Read <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center gap-2">
              <Button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Previous
              </Button>
              <div className="flex items-center px-4 text-slate-400">
                Page {page + 1}
              </div>
              <Button
                onClick={() => setPage(page + 1)}
                disabled={!hasMore}
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Next
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
