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
  { symbol: "QRDO", name: "D-Wave Systems" },
];

export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
  try {
    // Check cache first
    const cached = stockCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    // Fetch from Yahoo Finance API with 5-day range to get previous close
    const result = await callDataApi("YahooFinance/get_stock_chart", {
      query: {
        symbol: symbol.toUpperCase(),
        region: "US",
        interval: "1d",
        range: "5d",
      },
    });

    const apiResult = result as any;
    if (!apiResult?.chart?.result?.[0]) {
      return null;
    }

    const chartData = apiResult.chart.result[0];
    const meta = chartData.meta as any;
    const timestamps = chartData.timestamp as number[];
    const closes = chartData.indicators?.quote?.[0]?.close as number[];

    // Calculate real daily change from historical data
    let change = 0;
    let changePercent = 0;

    const currentPrice = meta.regularMarketPrice || 0;

    // If we have historical close data, use it to calculate real daily change
    if (closes && closes.length >= 2) {
      const previousClose = closes[closes.length - 2];
      if (previousClose > 0) {
        change = currentPrice - previousClose;
        changePercent = change / previousClose;
      }
    } else if (meta.previousClose) {
      // Fallback to API's previousClose if available
      change = currentPrice - meta.previousClose;
      changePercent = meta.previousClose > 0 ? change / meta.previousClose : 0;
    }

    const quote: StockQuote = {
      symbol: meta.symbol,
      name: meta.longName || meta.symbol,
      price: currentPrice,
      change: change,
      changePercent: changePercent,
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
  const percentSign = changePercent >= 0 ? "+" : "";
  return `${sign}${change.toFixed(2)} (${percentSign}${(changePercent * 100).toFixed(2)}%)`;
}
