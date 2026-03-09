#!/bin/bash
# ============================================================
# Quantum Daily × OpenClaw — One-Click 24h Automation Setup
# ============================================================
# This script installs OpenClaw, configures the Quantum Daily
# Skill, and sets up a system cron job for daily pipeline
# triggering. Supports macOS and Linux.
#
# Usage:
#   chmod +x setup.sh
#   QUANTUM_DAILY_URL="https://quantumnews-j6gvqm4g.manus.space" \
#   QUANTUM_WEBHOOK_SECRET="your-secret-here" \
#   ./setup.sh
# ============================================================

set -e

# ── Colors ──────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

print_header() {
  echo ""
  echo -e "${CYAN}${BOLD}⚛  Quantum Daily × OpenClaw Setup${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

print_step() {
  echo -e "${BLUE}${BOLD}[$1]${NC} $2"
}

print_ok() {
  echo -e "  ${GREEN}✓${NC} $1"
}

print_warn() {
  echo -e "  ${YELLOW}⚠${NC} $1"
}

print_err() {
  echo -e "  ${RED}✗${NC} $1"
}

# ── Validate inputs ──────────────────────────────────────────
print_header

if [ -z "$QUANTUM_DAILY_URL" ]; then
  print_err "QUANTUM_DAILY_URL is required."
  echo ""
  echo "  Usage:"
  echo "    QUANTUM_DAILY_URL='https://quantumnews-j6gvqm4g.manus.space' \\"
  echo "    QUANTUM_WEBHOOK_SECRET='your-secret' \\"
  echo "    ./setup.sh"
  echo ""
  exit 1
fi

SITE_URL="${QUANTUM_DAILY_URL%/}"  # Strip trailing slash
WEBHOOK_SECRET="${QUANTUM_WEBHOOK_SECRET:-}"

print_step "1/5" "Checking prerequisites..."

# Check Node.js
if ! command -v node &>/dev/null; then
  print_err "Node.js is not installed. Please install Node.js 18+ first:"
  echo "       https://nodejs.org/en/download"
  exit 1
fi
NODE_VER=$(node --version)
print_ok "Node.js ${NODE_VER}"

# Check npm
if ! command -v npm &>/dev/null; then
  print_err "npm is not installed."
  exit 1
fi
print_ok "npm $(npm --version)"

# Check curl
if ! command -v curl &>/dev/null; then
  print_err "curl is not installed."
  exit 1
fi
print_ok "curl available"

# ── Test site connectivity ───────────────────────────────────
print_step "2/5" "Testing Quantum Daily site connectivity..."

PING_RESPONSE=$(curl -s --max-time 10 "${SITE_URL}/api/webhook/ping" 2>/dev/null || echo "")
if echo "$PING_RESPONSE" | grep -q '"status":"ok"'; then
  print_ok "Site is reachable: ${SITE_URL}"
else
  print_warn "Could not reach ${SITE_URL}/api/webhook/ping"
  print_warn "Make sure the site is published and running."
  echo ""
  read -p "  Continue anyway? (y/N) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# ── Install OpenClaw ─────────────────────────────────────────
print_step "3/5" "Installing OpenClaw..."

if command -v openclaw &>/dev/null; then
  CLAW_VER=$(openclaw --version 2>/dev/null || echo "unknown")
  print_ok "OpenClaw already installed (${CLAW_VER})"
else
  echo "  Installing openclaw globally..."
  npm install -g openclaw@latest
  print_ok "OpenClaw installed"
fi

# ── Install Quantum Daily Skill ──────────────────────────────
print_step "4/5" "Installing Quantum Daily Skill..."

SKILL_DIR="${HOME}/.openclaw/workspace/skills/quantum-daily"
mkdir -p "${SKILL_DIR}"

# Copy SKILL.md to openclaw workspace
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "${SCRIPT_DIR}/SKILL.md" ]; then
  cp "${SCRIPT_DIR}/SKILL.md" "${SKILL_DIR}/SKILL.md"
  print_ok "SKILL.md installed to ${SKILL_DIR}"
else
  # Download from site if not available locally
  curl -s "${SITE_URL}/openclaw-skill/SKILL.md" -o "${SKILL_DIR}/SKILL.md" 2>/dev/null || true
  print_warn "SKILL.md not found locally, please copy it manually to ${SKILL_DIR}/"
fi

# Configure openclaw.json
OPENCLAW_CONFIG="${HOME}/.openclaw/openclaw.json"
mkdir -p "${HOME}/.openclaw"

if [ -f "${OPENCLAW_CONFIG}" ]; then
  print_warn "openclaw.json already exists. Skipping auto-config."
  print_warn "Please manually add the following to your openclaw.json:"
  echo ""
  echo '  "skills": {'
  echo '    "entries": {'
  echo '      "quantum-daily": {'
  echo '        "enabled": true,'
  echo '        "env": {'
  echo "          \"QUANTUM_DAILY_URL\": \"${SITE_URL}\","
  echo "          \"QUANTUM_WEBHOOK_SECRET\": \"${WEBHOOK_SECRET}\""
  echo '        }'
  echo '      }'
  echo '    }'
  echo '  }'
  echo ""
else
  cat > "${OPENCLAW_CONFIG}" << EOF
{
  "skills": {
    "entries": {
      "quantum-daily": {
        "enabled": true,
        "env": {
          "QUANTUM_DAILY_URL": "${SITE_URL}",
          "QUANTUM_WEBHOOK_SECRET": "${WEBHOOK_SECRET}"
        }
      }
    }
  }
}
EOF
  print_ok "openclaw.json created with Quantum Daily skill"
fi

# ── Setup cron job ───────────────────────────────────────────
print_step "5/5" "Setting up daily cron job (UTC 00:05)..."

# Build the cron command
CRON_CMD="curl -s -X POST \"${SITE_URL}/api/webhook/trigger\" -H \"X-Webhook-Secret: ${WEBHOOK_SECRET}\" -H \"Content-Type: application/json\" >> \${HOME}/quantum-daily-cron.log 2>&1"
CRON_LINE="5 0 * * * ${CRON_CMD}"

# Check if cron already exists
if crontab -l 2>/dev/null | grep -q "quantum-daily"; then
  print_warn "Cron job already exists. Skipping."
else
  # Add to crontab
  (crontab -l 2>/dev/null; echo "${CRON_LINE}") | crontab -
  print_ok "Cron job added: runs daily at UTC 00:05"
fi

# ── Summary ──────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}${BOLD}✅  Setup Complete!${NC}"
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${BOLD}Site:${NC}           ${SITE_URL}"
echo -e "  ${BOLD}Skill:${NC}          ${SKILL_DIR}/SKILL.md"
echo -e "  ${BOLD}Config:${NC}         ${OPENCLAW_CONFIG}"
echo -e "  ${BOLD}Cron log:${NC}       ~/quantum-daily-cron.log"
echo -e "  ${BOLD}Schedule:${NC}       Daily at UTC 00:05 (after report generation)"
echo ""
echo -e "  ${BOLD}Next steps:${NC}"
echo -e "  1. Run ${CYAN}openclaw onboard${NC} to connect WhatsApp/Telegram"
echo -e "  2. Run ${CYAN}openclaw channels login${NC} to authenticate"
echo -e "  3. Run ${CYAN}openclaw start${NC} to start the daemon"
echo ""
echo -e "  ${BOLD}Test the connection:${NC}"
echo -e "  ${CYAN}curl -s ${SITE_URL}/api/webhook/ping | jq .${NC}"
echo ""
if [ -n "$WEBHOOK_SECRET" ]; then
  echo -e "  ${BOLD}Manual trigger:${NC}"
  echo -e "  ${CYAN}curl -s -X POST ${SITE_URL}/api/webhook/trigger \\"
  echo -e "    -H 'X-Webhook-Secret: ${WEBHOOK_SECRET}' \\"
  echo -e "    -H 'Content-Type: application/json' | jq .${NC}"
  echo ""
fi
echo -e "  ${BOLD}Chat commands (WhatsApp/Telegram):${NC}"
echo -e "  • 今天有什么量子新闻？"
echo -e "  • quantum news today"
echo -e "  • 量子日报"
echo ""
