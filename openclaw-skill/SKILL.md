---
name: quantum-daily
description: Query the Quantum Daily intelligence platform for the latest quantum technology news, research papers, and financial reports. Fetches pre-generated bilingual (EN/ZH) summaries — no LLM call needed per query, zero extra token cost.
metadata: {"openclaw":{"emoji":"⚛","requires":{"env":["QUANTUM_DAILY_URL"]},"primaryEnv":"QUANTUM_DAILY_URL"}}
---

# Quantum Daily Skill ⚛

This skill connects OpenClaw to the **Quantum Daily** platform. All responses are served from pre-generated JSON — **no LLM is invoked per query**, which means zero Manus token cost per chat message.

The platform uses **DeepSeek API** (not Manus credits) for the daily AI analysis, costing ~$0.006/day (~$2.19/year). Every query you make via WhatsApp/Telegram costs **$0.000**.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `QUANTUM_DAILY_URL` | ✅ | Base URL of your Quantum Daily site, e.g. `https://quantumnews-j6gvqm4g.manus.space` |
| `QUANTUM_WEBHOOK_SECRET` | Optional | Webhook secret for triggering report generation |

---

## Installation

```bash
# 1. Install OpenClaw
npm install -g openclaw@latest

# 2. Create skill directory
mkdir -p ~/.openclaw/workspace/skills/quantum-daily

# 3. Copy this file into the directory
cp SKILL.md ~/.openclaw/workspace/skills/quantum-daily/SKILL.md

# 4. Configure (see below)
openclaw onboard --install-daemon
openclaw channels login
```

---

## Configuration

Edit `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "quantum-daily": {
        "enabled": true,
        "env": {
          "QUANTUM_DAILY_URL": "https://quantumnews-j6gvqm4g.manus.space",
          "QUANTUM_WEBHOOK_SECRET": "your-webhook-secret-here"
        }
      }
    }
  }
}
```

---

## 24-Hour Automation (Always-On)

### Option A: System Cron (simplest)

```bash
# Edit crontab
crontab -e

# Add this line — triggers at UTC 00:05 every day
5 0 * * * curl -s -X POST "https://quantumnews-j6gvqm4g.manus.space/api/webhook/trigger" \
  -H "X-Webhook-Secret: YOUR_SECRET" \
  -H "Content-Type: application/json" \
  >> ~/quantum-daily.log 2>&1
```

> **Note:** The Quantum Daily server already has a built-in UTC 00:05 scheduler. The cron above is an optional external backup trigger.

### Option B: Docker Compose (VPS / always-on)

Create `~/quantum-automation/docker-compose.yml`:

```yaml
version: '3.8'
services:
  # OpenClaw daemon — handles WhatsApp/Telegram queries 24/7
  openclaw:
    image: node:22-alpine
    working_dir: /app
    command: >
      sh -c "npm install -g openclaw@latest &&
             openclaw start --daemon --no-interactive"
    environment:
      QUANTUM_DAILY_URL: https://quantumnews-j6gvqm4g.manus.space
      QUANTUM_WEBHOOK_SECRET: ${QUANTUM_WEBHOOK_SECRET}
    volumes:
      - ~/.openclaw:/root/.openclaw
    restart: unless-stopped

  # Backup cron trigger (in case server scheduler misses)
  quantum-cron:
    image: curlimages/curl:latest
    environment:
      QUANTUM_DAILY_URL: https://quantumnews-j6gvqm4g.manus.space
      QUANTUM_WEBHOOK_SECRET: ${QUANTUM_WEBHOOK_SECRET}
    entrypoint: >
      sh -c "
        echo 'Quantum Daily cron started';
        while true; do
          NOW=$$(date -u +%H%M);
          if [ \"$$NOW\" = \"0005\" ]; then
            echo \"[$$( date -u )] Triggering daily pipeline...\";
            curl -s -X POST $$QUANTUM_DAILY_URL/api/webhook/trigger
              -H \"X-Webhook-Secret: $$QUANTUM_WEBHOOK_SECRET\"
              -H \"Content-Type: application/json\";
            sleep 60;
          fi;
          sleep 30;
        done
      "
    restart: unless-stopped
```

```bash
# Create .env file
cat > ~/quantum-automation/.env << EOF
QUANTUM_WEBHOOK_SECRET=your-secret-here
EOF

# Start all services
cd ~/quantum-automation
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Option C: PM2 (Node.js process manager)

```bash
# Install PM2
npm install -g pm2

# Create trigger script
cat > ~/quantum-trigger.sh << 'EOF'
#!/bin/bash
curl -s -X POST "https://quantumnews-j6gvqm4g.manus.space/api/webhook/trigger" \
  -H "X-Webhook-Secret: YOUR_SECRET" \
  -H "Content-Type: application/json"
EOF
chmod +x ~/quantum-trigger.sh

# Schedule with PM2 cron
pm2 start ~/quantum-trigger.sh --name quantum-daily --cron "5 0 * * *" --no-autorestart
pm2 save
pm2 startup
```

---

## How to Use (Chat Commands)

Send any of these to your OpenClaw bot on WhatsApp/Telegram:

| Message | Action |
|---|---|
| 今天有什么量子新闻？ | Get today's report (Chinese) |
| 量子日报 | Get latest report |
| quantum news | Get latest report (English) |
| 最新量子报告 | Full report with article list |
| 触发今天的量子报告 | Trigger pipeline for today |
| trigger quantum report | Trigger pipeline for today |
| 量子报告状态 | Check today's pipeline status |

---

## API Endpoints

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/webhook/ping` | GET | None | Health check |
| `/api/webhook/latest` | GET | None | Latest report JSON |
| `/api/webhook/status?date=YYYY-MM-DD` | GET | None | Pipeline status |
| `/api/webhook/trigger` | POST | X-Webhook-Secret | Trigger pipeline |

### Get latest report

```bash
curl -s "https://quantumnews-j6gvqm4g.manus.space/api/webhook/latest" | jq .
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
  "total": 55,
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

---

## Response Templates

### Chinese Response Template
```
⚛ **量子科技每日情报 — {date}**

📋 **今日摘要**
{summaryZh}

🔥 **今日头条（共 {total} 篇）**

**1. [{zh}]({url})**
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

**1. [{en}]({url})**
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
4. **Never re-summarise or re-analyse** the content — the summaries are already AI-generated by DeepSeek and are bilingual. Just present them.
5. If the user asks to "trigger" or "generate" a new report, use the webhook trigger call (requires `QUANTUM_WEBHOOK_SECRET`).
6. If the user asks for a specific date, use: `curl -s "${QUANTUM_DAILY_URL}/api/webhook/status?date=YYYY-MM-DD"`

---

## Cost Analysis

| Action | Cost |
|---|---|
| Query latest report via OpenClaw | **$0.000** (pure HTTP fetch) |
| Daily AI analysis via DeepSeek | ~$0.006/day |
| Daily AI analysis via Manus (fallback) | Platform credits |
| **Annual total (DeepSeek)** | **~$2.19/year** |

**vs. Manus-only:** Every "what's the quantum news?" query would invoke an LLM call. At 10 queries/day × 365 days = 3,650 LLM calls vs. **365 LLM calls** (one per day) — a **10x reduction** in AI costs, plus DeepSeek is ~10x cheaper than Manus per token.

**Net savings: ~99% cost reduction.**

---

## Troubleshooting

**"No report available"** — Go to your site's `/admin` page and click "Run Now", or send "触发今天的量子报告".

**"Connection refused"** — Check `QUANTUM_DAILY_URL` is correct and the site is published.

**"Unauthorized"** — `QUANTUM_WEBHOOK_SECRET` doesn't match. Check Manus Secrets panel.

**Pipeline stuck in "analyzing"** — DeepSeek API may be slow. Wait 5-10 minutes.

**DeepSeek not working** — The system automatically falls back to Manus built-in LLM. Check `/admin` → AI Analysis Engine section.
