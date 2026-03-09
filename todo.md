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
