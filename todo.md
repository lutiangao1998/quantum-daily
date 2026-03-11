# Quantum Daily — Project TODO

## Database & Backend
- [x] Database schema: reports, articles tables
- [x] DB migration pushed
- [x] Data crawler: arXiv, Google News RSS, Nature, Reuters RSS, IEEE, Phys.org
- [x] AI analysis: summarization, categorization, importance scoring (bilingual)
- [x] PDF report generation with puppeteer + HTML template
- [x] S3 upload for generated PDFs
- [x] tRPC router: reports.list, reports.byId, reports.byDate, reports.latest, reports.openclaw, reports.triggerGeneration, reports.status
- [x] Scheduled daily pipeline (cron at UTC 00:05)
- [x] Manual trigger endpoint for admin testing
- [x] Pipeline orchestrator (crawl → analyze → save → PDF → notify)

## Frontend
- [x] Global design system (dark quantum theme, CSS variables, OKLCH colors)
- [x] Landing/Hero page with platform intro, stats, features, categories
- [x] Reports archive page with date filtering and pagination
- [x] Report detail page (bilingual summary + article list + category filter + PDF download)
- [x] Responsive layout
- [x] Quantum category badges and importance score colors

## OpenClaw Integration
- [x] SKILL.md file for OpenClaw quantum-daily skill
- [x] Skill API endpoint (/api/trpc/reports.openclaw) for WhatsApp/Telegram queries
- [x] Bilingual response templates in SKILL.md

## Testing
- [x] Vitest: getTodayDate pipeline util
- [x] Vitest: buildReportHTML (HTML generation, bilingual, XSS, empty state)
- [x] Vitest: auth.logout (session cookie clearing)
- [x] All 10 tests passing

## Delivery
- [x] Checkpoint saved
- [x] OpenClaw SKILL.md delivered to user

## OpenClaw Deep Integration (v1.1)
- [ ] Webhook endpoint: POST /api/webhook/trigger (with secret token auth)
- [ ] External LLM support: configure own OpenAI/Claude/Gemini API key via env
- [ ] Admin panel page with pipeline status, manual trigger, source config
- [ ] Rewrite OpenClaw SKILL.md: direct API query (no Manus LLM needed)
- [ ] OpenClaw setup guide: step-by-step install + config instructions
- [ ] LLM provider selector in analyzer (Manus built-in vs external key)

## OpenClaw Integration v1.1 (Manus-only)
- [x] Webhook endpoint POST /api/webhook/trigger with WEBHOOK_SECRET auth
- [x] Admin panel page: pipeline status, manual trigger, report history
- [x] Rewrite OpenClaw SKILL.md: pure API query, zero extra token cost
- [x] OpenClaw setup guide embedded in admin panel

## Pipeline Bug Fixes (v1.2) ✅
- [x] Debug crawler: verify real HTTP fetches from arXiv/Google News RSS
- [x] Fix broken RSS URLs (Reuters, IEEE, PhysOrg)
- [x] Fix CSS @import order issue
- [x] Promote user to admin role in database
- [x] Fix analyzer: real LLM calls confirmed working
- [x] Fix PDF generator: Puppeteer + system Chromium confirmed working
- [x] End-to-end test: 55 articles collected, PDF at CDN ✅

## External LLM Integration (v1.3)
- [x] Add DEEPSEEK_API_KEY and OPENAI_API_KEY env secrets
- [x] Rewrite analyzer: multi-provider LLM (DeepSeek > OpenAI > Manus fallback)
- [x] LLM provider config: model selection, temperature, max tokens
- [x] Admin panel: show active LLM provider + cost estimate per report
- [x] OpenClaw 24h automation: docker-compose.yml + cron config + deployment guide
- [x] Test external API analysis end-to-end (DeepSeek confirmed active, $0.01232/day)

## Email Subscription + OpenClaw 24h Automation (v1.4) ✅
- [x] DB: add email_subscriptions table (email, name, locale, active, token)
- [x] Server: email sending engine (Resend API, HTML template with PDF link)
- [x] Server: subscribe/unsubscribe/stats tRPC procedures
- [x] Server: sendDailyReportToSubscribers() — sends PDF + top 10 articles
- [x] Pipeline: auto-trigger email after report generation completes (Step 6)
- [x] Frontend: subscription form on home page (locale toggle zh/en)
- [x] Frontend: /unsubscribe page with token-based one-click unsubscribe
- [x] Admin: subscriber count + last send status in admin panel
- [x] OpenClaw: one-click install script (setup.sh) with cron auto-config
- [x] 19 tests passing, TypeScript zero errors

## RSS Feed Fixes (v1.5)
- [x] Fix Reuters RSS URL — removed (DNS unreachable from sandbox)
- [x] Fix Nature RSS URL — removed (HTTP 406 blocked)
- [x] Replace with Hacker News (quantum filter)
- [x] Test all RSS sources: arXiv (173), Google News (100), Hacker News (30), MIT Tech Review (10), IEEE (30), PhysOrg (30) ✅

## Quantum Stock + Search (v1.6)
- [x] Stock: fetch real-time prices for IonQ (IONQ), IBM, Rigetti (RGTI), Google (GOOGL), Honeywell (HON) — backend ready
- [x] Stock: tRPC procedure stocks.quotes with 15min cache — backend ready
- [x] Stock: StockTicker component on home page (live quotes with daily high/low/volume)
- [ ] Stock: include stock snapshot in daily PDF report
- [x] Search: full-text search API across article titles + summaries — backend ready
- [x] Search: /search page with keyword input, category filter, date range ✅
- [x] Search: highlight matched keywords in results (importance score bar)
- [x] Search: add search entry in navbar

## Stock Ticker Improvements (v1.7.1)
- [x] Fix daily change calculation (show real day change from previous close) ✅
- [x] Add trading platform links (TradingView, Yahoo Finance, Moomoo) ✅
- [x] Make stock cards clickable with external links ✅
- [x] Test all trading platform links (all tests passing) ✅

## Stock Ticker Bug Fix (v1.7.2)
- [x] Debug: verify Yahoo Finance API returns correct previousClose value
- [x] Fix: ensure change = current price - previous close (using historical data) ✅
- [x] Verify: all tests passing (21/21) ✅

## Add D-Wave Stock (v1.7.3)
- [x] Add QRDO (D-Wave) to QUANTUM_STOCKS list ✅
- [x] Fix grid layout to display 6 stocks in one row (changed lg:grid-cols-5 to lg:grid-cols-6) ✅
- [x] Test D-Wave stock displays correctly (all tests passing) ✅
- [x] Verify all 6 stocks display in ticker (IONQ, IBM, RGTI, GOOGL, HON, QRDO) ✅
