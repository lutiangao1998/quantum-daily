import { getDb } from "./db";
import { articles } from "../drizzle/schema";
import { sql, ilike, and, between } from "drizzle-orm";

export interface SearchResult {
  id: number;
  title: string;
  titleZh: string;
  summaryEn: string;
  summaryZh: string;
  source: string;
  category: string;
  importanceScore: number;
  url: string;
  reportDate: Date;
}

export async function searchArticles(
  keyword: string,
  category?: string,
  startDate?: Date,
  endDate?: Date,
  limit: number = 50,
  offset: number = 0
): Promise<{ results: SearchResult[]; total: number }> {
  const db = await getDb();
  if (!db) {
    console.warn("[SearchService] Database not available");
    return { results: [], total: 0 };
  }

  try {
    // Build search conditions
    const conditions = [];

    // Keyword search across title and summaries
    if (keyword && keyword.trim()) {
      const searchPattern = `%${keyword}%`;
      conditions.push(
        sql`(
          ${articles.title} ILIKE ${searchPattern} OR
          ${articles.titleZh} ILIKE ${searchPattern} OR
          ${articles.summaryEn} ILIKE ${searchPattern} OR
          ${articles.summaryZh} ILIKE ${searchPattern}
        )`
      );
    }

    // Category filter
    if (category && category !== "all") {
      conditions.push(sql`${articles.category} = ${category}`);
    }

    // Date range filter
    if (startDate && endDate) {
      conditions.push(between(articles.createdAt, startDate, endDate));
    } else if (startDate) {
      conditions.push(sql`${articles.createdAt} >= ${startDate}`);
    } else if (endDate) {
      conditions.push(sql`${articles.createdAt} <= ${endDate}`);
    }

    // Combine all conditions
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(articles)
      .where(whereClause);
    const total = countResult[0]?.count || 0;

    // Get paginated results
    const results = await db
      .select({
        id: articles.id,
        title: articles.title,
        titleZh: articles.titleZh,
        summaryEn: articles.summaryEn,
        summaryZh: articles.summaryZh,
        source: articles.source,
        category: articles.category,
        importanceScore: articles.importanceScore,
        url: articles.url,
        reportDate: articles.createdAt,
      })
      .from(articles)
      .where(whereClause)
      .orderBy(sql`${articles.importanceScore} DESC, ${articles.createdAt} DESC`)
      .limit(limit)
      .offset(offset);

    return { results: results as SearchResult[], total };
  } catch (error) {
    console.error("[SearchService] Error searching articles:", error);
    return { results: [], total: 0 };
  }
}

export function highlightKeyword(text: string, keyword: string): string {
  if (!keyword || !text) return text;
  const regex = new RegExp(`(${keyword})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
}

export const QUANTUM_CATEGORIES = [
  { value: "quantum_computing", label: "Quantum Computing" },
  { value: "quantum_communication", label: "Quantum Communication" },
  { value: "quantum_sensing", label: "Quantum Sensing" },
  { value: "quantum_cryptography", label: "Quantum Cryptography" },
];
