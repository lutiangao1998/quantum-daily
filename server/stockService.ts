import { callDataApi } from "./_core/dataApi";

// Note: This service uses Manus built-in Yahoo Finance API
// No additional API keys needed - credentials are injected by the platform

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  currency: string;
  timestamp: number;
}

// Cache for stock quotes (15 minutes)
const stockCache = new Map<string, { data: StockQuote; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

const QUANTUM_STOCKS = [
  { symbol: "IONQ", name: "IonQ Inc." },
  { symbol: "IBM", name: "IBM" },
  { symbol: "RGTI", name: "Rigetti Computing" },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "HON", name: "Honeywell International" },
];

export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
  try {
    // Check cache first
    const cached = stockCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    // Fetch from Yahoo Finance API
    const result = await callDataApi("YahooFinance/get_stock_chart", {
      query: {
        symbol: symbol.toUpperCase(),
        region: "US",
        interval: "1d",
        range: "1d",
        includeAdjustedClose: "true",
      },
    });

    const apiResult = result as any;
    if (!apiResult?.chart?.result?.[0]) {
      return null;
    }

    const chartData = apiResult.chart.result[0];
    const meta = chartData.meta as any;

    const quote: StockQuote = {
      symbol: meta.symbol,
      name: meta.longName || meta.symbol,
      price: meta.regularMarketPrice || 0,
      change: (meta.regularMarketPrice || 0) - (meta.previousClose || 0),
      changePercent:
        ((meta.regularMarketPrice || 0) - (meta.previousClose || 0)) /
        (meta.previousClose || 1),
      dayHigh: meta.regularMarketDayHigh || 0,
      dayLow: meta.regularMarketDayLow || 0,
      volume: meta.regularMarketVolume || 0,
      currency: meta.currency || "USD",
      timestamp: Date.now(),
    };

    // Cache the result
    stockCache.set(symbol, { data: quote, timestamp: Date.now() });

    return quote;
  } catch (error) {
    console.error(`[StockService] Error fetching ${symbol}:`, error);
    return null;
  }
}

export async function getAllQuantumStocks(): Promise<StockQuote[]> {
  const quotes: StockQuote[] = [];

  for (const stock of QUANTUM_STOCKS) {
    const quote = await getStockQuote(stock.symbol);
    if (quote) {
      quotes.push(quote);
    }
  }

  return quotes;
}

export function formatStockChange(change: number, changePercent: number): string {
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(2)} (${sign}${(changePercent * 100).toFixed(2)}%)`;
}
