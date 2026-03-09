# OpenClaw 24h 自动化配置指南

> **Quantum Daily** × OpenClaw — 让量子资讯每天自动送达您的 WhatsApp / Telegram

---

## 您的网站信息

| 项目 | 值 |
|---|---|
| **网站地址** | `https://quantumnews-j6gvqm4g.manus.space` |
| **Webhook 端点** | `https://quantumnews-j6gvqm4g.manus.space/api/webhook/trigger` |
| **Ping 测试** | `https://quantumnews-j6gvqm4g.manus.space/api/webhook/ping` |
| **WEBHOOK_SECRET** | 在 Manus 管理面板 → Settings → Secrets 中查看 `WEBHOOK_SECRET` |

---

## 方案 A：Mac 本地运行（推荐，最简单）

### 前提条件
- macOS 10.15+
- 已安装 Node.js 18+（运行 `node --version` 检查）
- Mac 需要在每天 UTC 00:05（北京时间 08:05）时处于开机状态

### 第一步：下载安装脚本

```bash
# 从项目中复制 setup.sh（如果您有项目代码）
# 或者直接创建脚本文件：
curl -o setup.sh https://quantumnews-j6gvqm4g.manus.space/openclaw-skill/setup.sh
chmod +x setup.sh
```

### 第二步：运行一键安装

```bash
QUANTUM_DAILY_URL="https://quantumnews-j6gvqm4g.manus.space" \
QUANTUM_WEBHOOK_SECRET="在Manus管理面板查看WEBHOOK_SECRET值" \
./setup.sh
```

脚本会自动完成：
- ✅ 安装 OpenClaw（`npm install -g openclaw`）
- ✅ 配置 Quantum Daily Skill
- ✅ 添加系统 Cron（每天 UTC 00:05 自动触发）

### 第三步：连接 WhatsApp 或 Telegram

```bash
# 启动 OpenClaw 并扫码连接
openclaw start
```

---

## 方案 B：不依赖 Mac 开机 — 使用 GitHub Actions（免费，最稳定）

如果您不想依赖 Mac 每天开机，可以用 GitHub Actions 免费定时触发。

### 第一步：创建 GitHub 仓库

在 GitHub 创建一个私有仓库（如 `quantum-daily-cron`）

### 第二步：添加 Secret

进入仓库 → Settings → Secrets and variables → Actions → New repository secret：

| Name | Value |
|---|---|
| `WEBHOOK_SECRET` | 您的 WEBHOOK_SECRET 值 |

### 第三步：创建 Workflow 文件

在仓库中创建 `.github/workflows/daily-trigger.yml`：

```yaml
name: Quantum Daily Trigger

on:
  schedule:
    # 每天 UTC 00:05 触发（北京时间 08:05）
    - cron: '5 0 * * *'
  workflow_dispatch:  # 允许手动触发

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Quantum Daily Pipeline
        run: |
          RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
            "https://quantumnews-j6gvqm4g.manus.space/api/webhook/trigger" \
            -H "X-Webhook-Secret: ${{ secrets.WEBHOOK_SECRET }}" \
            -H "Content-Type: application/json")
          
          HTTP_CODE=$(echo "$RESPONSE" | tail -1)
          BODY=$(echo "$RESPONSE" | head -1)
          
          echo "Response: $BODY"
          echo "HTTP Status: $HTTP_CODE"
          
          if [ "$HTTP_CODE" != "200" ]; then
            echo "❌ Trigger failed with status $HTTP_CODE"
            exit 1
          fi
          
          echo "✅ Pipeline triggered successfully"
```

### 第四步：提交并启用

```bash
git add .github/workflows/daily-trigger.yml
git commit -m "Add Quantum Daily daily trigger"
git push
```

GitHub Actions 会在每天 UTC 00:05 自动运行，完全免费，无需任何服务器。

---

## 方案 C：VPS / 云服务器（最稳定，适合长期运行）

如果您有 VPS（阿里云、腾讯云、AWS 等），只需添加一行 Cron：

```bash
# 编辑 crontab
crontab -e

# 添加以下行（每天 UTC 00:05 触发）
5 0 * * * curl -s -X POST "https://quantumnews-j6gvqm4g.manus.space/api/webhook/trigger" -H "X-Webhook-Secret: 您的WEBHOOK_SECRET" -H "Content-Type: application/json" >> /var/log/quantum-daily.log 2>&1
```

---

## 验证配置是否成功

### 测试 Ping（无需密钥）

```bash
curl -s https://quantumnews-j6gvqm4g.manus.space/api/webhook/ping | python3 -m json.tool
```

期望输出：
```json
{
  "ok": true,
  "service": "quantum-daily",
  "version": "1.1",
  "timestamp": "2026-03-09T08:35:38.785Z"
}
```

### 手动触发一次报告生成

```bash
curl -s -X POST "https://quantumnews-j6gvqm4g.manus.space/api/webhook/trigger" \
  -H "X-Webhook-Secret: 您的WEBHOOK_SECRET" \
  -H "Content-Type: application/json" | python3 -m json.tool
```

期望输出：
```json
{
  "success": true,
  "message": "Pipeline started",
  "date": "2026-03-09"
}
```

### 查看最新报告状态

```bash
curl -s "https://quantumnews-j6gvqm4g.manus.space/api/webhook/latest" | python3 -m json.tool
```

---

## OpenClaw WhatsApp/Telegram 查询命令

配置完成后，您可以在 WhatsApp 或 Telegram 中发送：

| 命令 | 说明 |
|---|---|
| `今天有什么量子新闻？` | 获取今日量子资讯摘要 |
| `量子日报` | 查看最新报告 |
| `quantum news today` | 英文查询 |
| `下载今天的PDF` | 获取 PDF 下载链接 |
| `量子计算最新进展` | 按分类查询 |

---

## 常见问题

**Q: 触发后多久能看到报告？**
A: 大约 5-10 分钟。管道需要：抓取（1-2分钟）→ AI 分析（3-5分钟）→ PDF 生成（1分钟）→ 邮件发送。

**Q: 如果某天触发失败怎么办？**
A: 可以登录网站 `/admin` 页面手动点击 "Run Now" 重新触发。

**Q: 邮件什么时候发送？**
A: 报告生成完成后立即自动发送，通常在 UTC 00:10-00:15（北京时间 08:10-08:15）。

**Q: 如何查看 WEBHOOK_SECRET？**
A: 登录 Manus 管理面板 → 右侧 Management UI → Settings → Secrets，找到 `WEBHOOK_SECRET`。

---

*Quantum Daily v1.4 · Powered by DeepSeek AI × OpenClaw × Resend*
