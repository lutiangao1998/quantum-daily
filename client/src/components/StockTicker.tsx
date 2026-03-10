import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  currency: string;
}

export function StockTicker() {
  const { data, isLoading } = trpc.stocks.quotes.useQuery();
  const [stocks, setStocks] = useState<StockQuote[]>([]);

  useEffect(() => {
    if (data?.data) {
      setStocks(data.data);
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-32 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {stocks.map((stock) => {
        const isPositive = stock.change >= 0;
        const changeColor = isPositive ? "text-green-400" : "text-red-400";
        const bgColor = isPositive ? "bg-green-500/10" : "bg-red-500/10";

        return (
          <Card
            key={stock.symbol}
            className={`p-4 border-0 ${bgColor} bg-gradient-to-br from-slate-800/50 to-slate-900/50 hover:from-slate-700/50 hover:to-slate-800/50 transition-all`}
          >
            <div className="space-y-3">
              {/* Symbol & Name */}
              <div>
                <div className="font-bold text-lg text-white">{stock.symbol}</div>
                <div className="text-xs text-slate-400">{stock.name}</div>
              </div>

              {/* Price */}
              <div className="text-2xl font-bold text-white">
                ${stock.price.toFixed(2)}
              </div>

              {/* Change */}
              <div className={`flex items-center gap-2 ${changeColor} font-semibold`}>
                {isPositive ? (
                  <TrendingUp size={16} />
                ) : (
                  <TrendingDown size={16} />
                )}
                <span>
                  {isPositive ? "+" : ""}
                  {stock.change.toFixed(2)} ({(stock.changePercent * 100).toFixed(2)}%)
                </span>
              </div>

              {/* Day Range */}
              <div className="text-xs text-slate-400 space-y-1">
                <div>
                  High: <span className="text-slate-300">${stock.dayHigh.toFixed(2)}</span>
                </div>
                <div>
                  Low: <span className="text-slate-300">${stock.dayLow.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
