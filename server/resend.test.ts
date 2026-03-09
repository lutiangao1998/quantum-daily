import { describe, it, expect } from "vitest";

describe("Resend API Key validation", () => {
  it("RESEND_API_KEY is configured in environment", () => {
    const key = process.env.RESEND_API_KEY;
    expect(key).toBeTruthy();
    expect(key!.length).toBeGreaterThan(10);
    expect(key).toMatch(/^re_/);
  });

  it("RESEND_FROM_EMAIL is configured", () => {
    const from = process.env.RESEND_FROM_EMAIL;
    expect(from).toBeTruthy();
    expect(from).toMatch(/@/);
  });

  it("Resend API is reachable and key is valid", async () => {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY not set");

    // Use the /domains endpoint as a lightweight validation (no email sent)
    const response = await fetch("https://api.resend.com/domains", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
    });

    // 200 = valid key, 401 = invalid key
    expect(response.status).toBe(200);
    const data = await response.json() as { data?: unknown[] };
    expect(data).toHaveProperty("data");
  }, 15000);
});
