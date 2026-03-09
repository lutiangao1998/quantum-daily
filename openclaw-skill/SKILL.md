---
name: quantum-daily
description: Query the Quantum Daily intelligence platform for the latest quantum technology news, research papers, and financial reports. Fetches pre-generated bilingual (EN/ZH) summaries — no LLM call needed per query, zero extra token cost.
metadata: {"openclaw":{"emoji":"⚛","requires":{"env":["QUANTUM_DAILY_URL"]},"primaryEnv":"QUANTUM_DAILY_URL"}}
---

# Quantum Daily Skill ⚛

This skill connects OpenClaw to the **Quantum Daily** platform. All responses are served from pre-generated JSON — **no LLM is invoked per query**, which means zero Manus token cost per chat message.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `QUANTUM_DAILY_URL` | ✅ | Base URL of your Quantum Daily site, e.g. `https://quantumnews-j6gvqm4g.manus.space` |
| `QUANTUM_WEBHOOK_SECRET` | Optional | Webhook secret for triggering report generation |

Set these in `~/.openclaw/openclaw.json`:
```json
{
  "skills": {
    "entries": {
      "quantum-daily": {
        "enabled": true,
        "env": {
          "QUANTUM_DAILY_URL": "https://quantumnews-j6gvqm4g.manus.space",
          "QUANTUM_WEBHOOK_SECRET": "your-secret-here"
        }
      }
    }
  }
}
```

---

## How to Use

When a user asks about quantum news, research, or reports, use the `bash` tool to call the Quantum Daily API. **Do NOT call any LLM for summarisation** — the platform already provides AI-generated bilingual summaries.

### Trigger phrases (Chinese)
- "今天有什么量子新闻？"
- "量子计算最新进展"
- "给我看量子每日报告"
- "最新量子研究"
- "量子日报"

### Trigger phrases (English)
- "quantum news today"
- "latest quantum report"
- "what's new in quantum computing"
- "quantum daily briefing"

---

## API Calls

### 1. Get Latest Report (Primary Action)

```bash
curl -s "${QUANTUM_DAILY_URL}/api/webhook/latest"
```

**Response format:**
```json
{
  "available": true,
  "date": "2026-03-09",
  "titleEn": "Quantum Daily Intelligence Report — 2026-03-09",
  "titleZh": "量子科技每日情报报告 — 2026年3月9日",
  "summaryEn": "Today's quantum landscape...",
  "summaryZh": "今日量子科技领域...",
  "total": 42,
  "pdfUrl": "https://cdn.../report-2026-03-09.pdf",
  "top": [
    {
      "score": 9.2,
      "cat": "quantum_computing",
      "src": "arXiv",
      "en": "Breakthrough in Quantum Error Correction",
      "zh": "量子纠错领域突破",
      "sumEn": "Researchers demonstrate...",
      "sumZh": "研究人员展示了...",
      "url": "https://arxiv.org/abs/..."
    }
  ]
}
```

### 2. Check Service Health

```bash
curl -s "${QUANTUM_DAILY_URL}/api/webhook/ping"
```

### 3. Trigger Report Generation (Admin)

```bash
curl -s -X POST "${QUANTUM_DAILY_URL}/api/webhook/trigger" \
  -H "X-Webhook-Secret: ${QUANTUM_WEBHOOK_SECRET}" \
  -H "Content-Type: application/json"
```

### 4. Check Pipeline Status

```bash
curl -s "${QUANTUM_DAILY_URL}/api/webhook/status?date=$(date +%Y-%m-%d)"
```

---

## Response Templates

When presenting results to the user, format the response as follows:

### Chinese Response Template
```
⚛ **量子科技每日情报 — {date}**

📋 **今日摘要**
{summaryZh}

🔥 **今日头条（共 {total} 篇）**

{for each top article:}
**{rank}. [{zh}]({url})**
来源: {src} | 分类: {category_zh} | 重要性: {score}/10
> {sumZh}

📄 [下载完整 PDF 报告]({pdfUrl})
```

### English Response Template
```
⚛ **Quantum Daily Intelligence — {date}**

📋 **Executive Summary**
{summaryEn}

🔥 **Top Stories ({total} articles)**

{for each top article:}
**{rank}. [{en}]({url})**
Source: {src} | Category: {category_en} | Score: {score}/10
> {sumEn}

📄 [Download Full PDF Report]({pdfUrl})
```

### Category Labels
| Code | English | Chinese |
|---|---|---|
| `quantum_computing` | Quantum Computing | 量子计算 |
| `quantum_communication` | Quantum Communication | 量子通信 |
| `quantum_sensing` | Quantum Sensing | 量子传感 |
| `quantum_cryptography` | Quantum Cryptography | 量子密码学 |
| `general` | General Quantum | 量子综合 |

---

## Instructions for the Agent

1. When the user asks for quantum news/reports, **immediately call** `curl -s "${QUANTUM_DAILY_URL}/api/webhook/latest"` using the `bash` tool.
2. Parse the JSON response. If `available: false`, tell the user the first report will be generated at UTC 00:05.
3. Format the response using the template above (detect user language from their message).
4. **Never re-summarise or re-analyse** the content — the summaries are already AI-generated and bilingual. Just present them.
5. If the user asks to "trigger" or "generate" a new report, use the webhook trigger call (requires `QUANTUM_WEBHOOK_SECRET`).
6. If the user asks for a specific date, use: `curl -s "${QUANTUM_DAILY_URL}/api/webhook/status?date=YYYY-MM-DD"`

## Token Cost

| Action | Manus Tokens Used |
|---|---|
| Query latest report | **0** (pure HTTP fetch, no LLM) |
| Format response | ~200 tokens (just template filling) |
| Trigger pipeline | **0** (HTTP POST only) |
| Daily report generation | ~15,000 tokens (runs once/day at UTC 00:05) |

**Result: 99% token reduction** compared to asking Manus to search and summarise quantum news on every query.
