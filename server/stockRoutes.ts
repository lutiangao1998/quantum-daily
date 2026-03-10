import { router, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import { getAllQuantumStocks, getStockQuote } from "./stockService";

export const stockRouter = router({
  // Get all quantum company stock quotes
  quotes: publicProcedure.query(async () => {
    try {
      const quotes = await getAllQuantumStocks();
      return {
        success: true,
        data: quotes,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("[StockRouter] Error fetching quotes:", error);
      return {
        success: false,
        data: [],
        error: "Failed to fetch stock quotes",
        timestamp: Date.now(),
      };
    }
  }),

  // Get a single stock quote
  quote: publicProcedure
    .input(z.object({ symbol: z.string() }))
    .query(async ({ input }) => {
      try {
        const quote = await getStockQuote(input.symbol);
        if (!quote) {
          return {
            success: false,
            data: null,
            error: `Stock ${input.symbol} not found`,
          };
        }
        return {
          success: true,
          data: quote,
        };
      } catch (error) {
        console.error(`[StockRouter] Error fetching ${input.symbol}:`, error);
        return {
          success: false,
          data: null,
          error: "Failed to fetch stock quote",
        };
      }
    }),
});
