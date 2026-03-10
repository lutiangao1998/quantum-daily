import { router, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import { searchArticles, QUANTUM_CATEGORIES } from "./searchService";

export const searchRouter = router({
  // Search articles by keyword, category, and date range
  articles: publicProcedure
    .input(
      z.object({
        keyword: z.string().optional(),
        category: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      try {
        const { results, total } = await searchArticles(
          input.keyword || "",
          input.category,
          input.startDate,
          input.endDate,
          input.limit,
          input.offset
        );

        return {
          success: true,
          results,
          total,
          hasMore: input.offset + input.limit < total,
        };
      } catch (error) {
        console.error("[SearchRouter] Error searching:", error);
        return {
          success: false,
          results: [],
          total: 0,
          hasMore: false,
          error: "Search failed",
        };
      }
    }),

  // Get available categories
  categories: publicProcedure.query(() => {
    return QUANTUM_CATEGORIES;
  }),
});
