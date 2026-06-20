# MS Blogs Update Tracker

An Agentic Workflow project that automatically collects daily update information from major Microsoft and GitHub blogs and generates date-organized pages.

This repository serves as both a production-ready update tracking system and a demo implementation of GitHub Agentic Workflows.

## 📚 Documentation

- **`docs/DETAILED_DESIGN.md`** - System architecture design (Japanese)
- **`docs/AGENT_INSTRUCTIONS.md`** - AI agent instructions (Japanese)
- **`docs/IMPLEMENTATION_PLAN.md`** - 4-week implementation plan (Japanese)
- **`docs/PROJECT_START_GUIDE.md`** - Project start guide (Japanese)

## 🚀 Quick Start

### Local Development Setup

```bash
# Install dependencies
npm install

# Test blog fetching
npm run fetch

# Test diff detection
npm run diff

# Generate daily page
npm run generate

# Build static site (for GitHub Pages)
npm run build

# Run tests
npm test
```

### Target Blog Sources

- 🐙 GitHub Blog
- 💻 VSCode Blog
- ☁️ Azure Blog
- 📊 Microsoft 365 Blog
- 📈 Microsoft Fabric Blog
- 🤖 Microsoft AI Blog

## 📋 Implementation Phases

| Phase | Content | Status |
|-------|---------|--------|
| **Phase 1** (Week 1) | Blog fetch & diff detection scripts | ✅ Done |
| **Phase 2** (Week 2) | GitHub Actions workflows & AI integration | ✅ Done |
| **Phase 3** (Week 3) | Static site generation script | ✅ Done |
| **Phase 4** (Week 4) | Testing, deployment & operationalization | ✅ Done |

## 🔁 GitHub Actions Workflows

| Workflow | Trigger | Description |
|----------|---------|-------------|
| `daily-blog-scan.yml` | Daily 0:00 UTC / Manual | Fetch → diff → generate → create PR |
| `analyze-blogs.yml` | Manual / `workflow_call` | Fetch & analyze only |
| `publish-updates.yml` | Push to `main` / Manual | Build static site → Deploy to GitHub Pages |

## 🧪 Testing

```bash
npm test
# → 40 tests pass (using Node.js built-in test runner)
```

Test coverage:

- `tests/utils/date-utils.test.js` — Date utilities
- `tests/utils/cache-manager.test.js` — Cache management
- `tests/diff-analyzer.test.js` — Diff detection logic
- `tests/generate-daily-page.test.js` — Page generation helpers

## 🌐 GitHub Pages Deployment

1. Set repository Settings → Pages → Source to **GitHub Actions**
2. Changes to `content/updates/` on `main` branch trigger automatic deployment
3. Manual deploy: Actions tab → "Publish Updates to GitHub Pages" → "Run workflow"

## 🛠️ Tech Stack

- Node.js 24
- GitHub Actions / Agentic Workflows
- cheerio (HTML parsing)
- rss-parser (RSS parsing)
- Node.js built-in test runner (`node:test`)

## 📖 Detailed Documentation

See the `docs/` directory for implementation details.

---

**Project**: MS Blogs Update Tracker  
**Start Date**: 2026-06-20  
**Status**: ✅ Production Ready (Phase 4 complete)
