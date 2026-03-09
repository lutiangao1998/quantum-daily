---
name: quantum_daily
description: Query the Quantum Daily intelligence platform for the latest quantum technology news, research papers, and financial reports. Supports bilingual (English/Chinese) responses.
metadata: {"openclaw": {"emoji": "⚛", "requires": {"env": ["QUANTUM_DAILY_URL"]}, "primaryEnv": "QUANTUM_DAILY_URL", "homepage": "https://quantum-daily.manus.space"}}
---

# Quantum Daily Intelligence Skill ⚛

This skill connects to the **Quantum Daily** platform to retrieve the latest quantum technology intelligence reports.

## What You Can Do

- Fetch the **latest daily quantum report** with executive summary
- Get **top articles** ranked by AI importance score
- Filter by **quantum category**: computing, communication, sensing, cryptography
- Provide **bilingual responses** (English + Chinese)
- Share **PDF download links** for full reports

## Environment Variables

- `QUANTUM_DAILY_URL`: Base URL of the Quantum Daily platform (e.g., `https://quantum-daily.manus.space`)

## How to Use This Skill

When a user asks about quantum news, research, or technology updates, use the `fetch_quantum_report` tool below.

### Trigger Phrases
- "What's today's quantum news?"
- "今天有什么量子新闻？"
- "Show me the latest quantum computing research"
- "量子密码学最新进展"
- "Download the quantum daily report"
- "量子每日报告"
- "Top quantum stories this week"
- "量子科技头条"

## Tools

```json
{
  "tools": [
    {
      "name": "fetch_quantum_report",
      "description": "Fetch the latest quantum daily intelligence report from the Quantum Daily platform. Returns bilingual summary, top articles, and PDF download link.",
      "input_schema": {
        "type": "object",
        "properties": {
          "language": {
            "type": "string",
            "enum": ["en", "zh", "both"],
            "description": "Response language preference. 'en' for English only, 'zh' for Chinese only, 'both' for bilingual.",
            "default": "both"
          },
          "category": {
            "type": "string",
            "enum": ["all", "quantum_computing", "quantum_communication", "quantum_sensing", "quantum_cryptography"],
            "description": "Filter articles by quantum technology category.",
            "default": "all"
          },
          "top_n": {
            "type": "integer",
            "description": "Number of top articles to include in the response (1-10).",
            "default": 5
          }
        },
        "required": []
      }
    }
  ]
}
```

## Tool Implementation

When `fetch_quantum_report` is called:

1. Make a GET request to `${QUANTUM_DAILY_URL}/api/trpc/reports.openclaw`
2. Parse the JSON response
3. Format the response based on the `language` parameter
4. Filter articles by `category` if specified
5. Return the top `top_n` articles by importance score

### API Response Format

```json
{
  "result": {
    "data": {
      "available": true,
      "date": "2026-03-09",
      "title": "Quantum Daily Intelligence Report — March 9, 2026",
      "titleZh": "量子科技每日情报报告 — 2026年3月9日",
      "summaryEn": "Executive summary in English...",
      "summaryZh": "中文执行摘要...",
      "articleCount": 47,
      "pdfUrl": "https://cdn.example.com/reports/2026-03-09/quantum-daily-2026-03-09.pdf",
      "topArticles": [
        {
          "title": "Article title",
          "titleZh": "文章标题",
          "source": "arXiv",
          "category": "quantum_computing",
          "importanceScore": 9.2,
          "summaryEn": "English summary...",
          "summaryZh": "中文摘要...",
          "url": "https://arxiv.org/abs/..."
        }
      ]
    }
  }
}
```

## Response Formatting Guidelines

### English Response Template
```
⚛ **Quantum Daily — {date}**

📊 **Today's Summary**
{summaryEn}

🔥 **Top Stories** ({articleCount} total articles)

1. **[{score}] {title}**
   📌 {category} · {source}
   {summaryEn}
   🔗 {url}

...

📄 **Download Full PDF Report:** {pdfUrl}
```

### Chinese Response Template
```
⚛ **量子每日 — {date}**

📊 **今日摘要**
{summaryZh}

🔥 **头条新闻**（共 {articleCount} 篇文章）

1. **[{score}] {titleZh}**
   📌 {categoryZh} · {source}
   {summaryZh}
   🔗 {url}

...

📄 **下载完整 PDF 报告：** {pdfUrl}
```

### Category Labels
- `quantum_computing` → "Quantum Computing / 量子计算" ⚛
- `quantum_communication` → "Quantum Communication / 量子通信" 📡
- `quantum_sensing` → "Quantum Sensing / 量子传感" 🔬
- `quantum_cryptography` → "Quantum Cryptography / 量子密码学" 🔐
- `general` → "General / 综合" 🌐

### Importance Score Labels
- 8.0-10.0: 🔴 Critical / 重大突破
- 6.0-7.9: 🟡 High / 高影响力
- 4.0-5.9: 🟢 Medium / 中等重要
- 0.0-3.9: ⚪ Low / 一般

## Error Handling

If the API returns `available: false`, respond with:
- EN: "No quantum intelligence report is available yet. The first report will be generated automatically at UTC 00:00. Check back later!"
- ZH: "暂无量子情报报告。首份报告将在 UTC 00:00 自动生成，请稍后再查！"

If the API request fails, respond with:
- EN: "Unable to connect to the Quantum Daily platform. Please try again later."
- ZH: "无法连接到量子每日平台，请稍后重试。"

## Setup Instructions

1. Install this skill in your OpenClaw workspace:
   ```
   mkdir -p ~/.openclaw/workspace/skills/quantum-daily
   cp SKILL.md ~/.openclaw/workspace/skills/quantum-daily/
   ```

2. Set the environment variable in your OpenClaw config (`~/.openclaw/openclaw.json`):
   ```json
   {
     "skills": {
       "entries": {
         "quantum_daily": {
           "enabled": true,
           "env": {
             "QUANTUM_DAILY_URL": "https://your-quantum-daily-url.manus.space"
           }
         }
       }
     }
   }
   ```

3. Restart your OpenClaw gateway:
   ```
   openclaw gateway --restart
   ```

4. Test it by sending a message to your assistant:
   > "What's today's quantum news?"

---

*Quantum Daily Skill v1.0 · Compatible with OpenClaw AgentSkills spec*
*量子每日技能 v1.0 · 兼容 OpenClaw AgentSkills 规范*
