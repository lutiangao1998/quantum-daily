import { describe, it, expect } from "vitest";
import { getStockQuote } from "./stockService";

describe("Stock Service", () => {
  it("should handle invalid stock symbols gracefully", async () => {
    const quote = await getStockQuote("INVALID_SYMBOL_XYZ_12345");
    // Should return null for invalid symbols
    expect(quote).toBeNull();
  });

  it("should return null for empty symbol", async () => {
    const quote = await getStockQuote("");
    expect(quote).toBeNull();
  });
});
