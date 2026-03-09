import { describe, it, expect } from "vitest";

describe("DeepSeek API Key validation", () => {
  it("DEEPSEEK_API_KEY is configured in environment", () => {
    const key = process.env.DEEPSEEK_API_KEY;
    expect(key).toBeTruthy();
    expect(key!.length).toBeGreaterThan(10);
    // DeepSeek keys typically start with "sk-"
    expect(key).toMatch(/^sk-/);
  });

  it("DeepSeek API is reachable and key is valid", async () => {
    const key = process.env.DEEPSEEK_API_KEY;
    if (!key) throw new Error("DEEPSEEK_API_KEY not set");

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: "Reply with exactly: OK" }],
        max_tokens: 10,
        temperature: 0,
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    expect(data.choices?.[0]?.message?.content).toBeTruthy();
  }, 30000);
});
