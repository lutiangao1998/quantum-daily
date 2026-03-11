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

// Cache for stock quotes (24 hours for fallback)
const stockCache = new Map<string, { data: StockQuote; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes for fresh data
const FALLBACK_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours for fallback

const QUANTUM_STOCKS = [
  { symbol: "IONQ", name: "IonQ Inc." },
  { symbol: "IBM", name: "IBM" },
  { symbol: "RGTI", name: "Rigetti Computing" },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "HON", name: "Honeywell International" },
  { symbol: "QRDO", name: "D-Wave Systems" },
];

// Mock data for fallback when API is exhausted
const MOCK_STOCKS: Record<string, StockQuote> = {
  IONQ: {
    symbol: "IONQ",
    name: "IonQ Inc.",
    price: 35.12,
    change: -0.75,
    changePercent: -0.0209,
    dayHigh: 36.92,
    dayLow: 35.03,
    volume: 2500000,
    currency: "USD",
    timestamp: Date.now(),
  },
  IBM: {
    symbol: "IBM",
    name: "IBM",
    price: 250.2,
    change: -3.13,
    changePercent: -0.0124,
    dayHigh: 253.44,
    dayLow: 246.6,
    volume: 1800000,
    currency: "USD",
    timestamp: Date.now(),
  },
  RGTI: {
    symbol: "RGTI",
    name: "Rigetti Computing, Inc.",
    price: 16.99,
    change: -0.61,
    changePercent: -0.0347,
    dayHigh: 17.93,
    dayLow: 16.96,
    volume: 900000,
    currency: "USD",
    timestamp: Date.now(),
  },
  GOOGL: {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    price: 307.04,
    change: 0.68,
    changePercent: 0.0022,
    dayHigh: 309.5,
    dayLow: 305.57,
    volume: 15000000,
    currency: "USD",
    timestamp: Date.now(),
  },
  HON: {
    symbol: "HON",
    name: "Honeywell International Inc.",
    price: 240.61,
    change: 3.02,
    changePercent: 0.0127,
    dayHigh: 245.25,
    dayLow: 236.62,
    volume: 2000000,
    currency: "USD",
    timestamp: Date.now(),
  },
  QRDO: {
    symbol: "QRDO",
    name: "D-Wave Systems",
    price: 8.45,
    change: 0.15,
    changePercent: 0.0182,
    dayHigh: 8.65,
    dayLow: 8.25,
    volume: 1200000,
    currency: "USD",
    timestamp: Date.now(),
  },
};

export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
  try {
    // Check fresh cache first (15 minutes)
    const cached = stockCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    // Try to fetch from Yahoo Finance API
    try {
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
        throw new Error("Invalid API response");
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
    } catch (apiError) {
      console.error(`[StockService] API error for ${symbol}:`, apiError);

      // Check fallback cache (24 hours)
      if (cached && Date.now() - cached.timestamp < FALLBACK_CACHE_TTL) {
        console.log(`[StockService] Using fallback cache for ${symbol}`);
        return cached.data;
      }

      // Use mock data as last resort
      console.log(`[StockService] Using mock data for ${symbol}`);
      const mockQuote = MOCK_STOCKS[symbol];
      if (mockQuote) {
        stockCache.set(symbol, { data: mockQuote, timestamp: Date.now() });
        return mockQuote;
      }

      return null;
    }
  } catch (error) {
    console.error(`[StockService] Unexpected error fetching ${symbol}:`, error);
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
