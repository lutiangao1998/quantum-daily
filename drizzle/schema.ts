import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  json,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Daily quantum intelligence reports
 */
export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  /** Report date in YYYY-MM-DD format */
  reportDate: varchar("reportDate", { length: 10 }).notNull().unique(),
  title: varchar("title", { length: 512 }).notNull(),
  titleZh: varchar("titleZh", { length: 512 }),
  /** S3 URL of the generated PDF */
  pdfUrl: text("pdfUrl"),
  /** Number of articles collected */
  articleCount: int("articleCount").default(0).notNull(),
  /** Generation status */
  status: mysqlEnum("status", ["pending", "crawling", "analyzing", "generating", "completed", "failed"])
    .default("pending")
    .notNull(),
  /** Error message if failed */
  errorMessage: text("errorMessage"),
  /** Executive summary in English */
  summaryEn: text("summaryEn"),
  /** Executive summary in Chinese */
  summaryZh: text("summaryZh"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

/**
 * Individual articles collected for each report
 */
export const articles = mysqlTable("articles", {
  id: int("id").autoincrement().primaryKey(),
  reportId: int("reportId").notNull(),
  /** Article title in original language */
  title: varchar("title", { length: 1024 }).notNull(),
  /** Article title translated to Chinese */
  titleZh: varchar("titleZh", { length: 1024 }),
  /** Original article URL */
  url: text("url").notNull(),
  /** Source name: arXiv, Google News, Nature, Reuters, etc. */
  source: varchar("source", { length: 128 }).notNull(),
  /** Quantum category */
  category: mysqlEnum("category", [
    "quantum_computing",
    "quantum_communication",
    "quantum_sensing",
    "quantum_cryptography",
    "general",
  ])
    .default("general")
    .notNull(),
  /** AI-generated summary in English */
  summaryEn: text("summaryEn"),
  /** AI-generated summary in Chinese */
  summaryZh: text("summaryZh"),
  /** Importance score 0-10 assigned by AI */
  importanceScore: float("importanceScore").default(5.0),
  /** Authors (for research papers) */
  authors: text("authors"),
  /** Publication date */
  publishedAt: timestamp("publishedAt"),
  /** Raw content extracted from source */
  rawContent: text("rawContent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Article = typeof articles.$inferSelect;
export type InsertArticle = typeof articles.$inferInsert;
