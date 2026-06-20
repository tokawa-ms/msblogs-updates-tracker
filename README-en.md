# MS Blogs Update Tracker

An Agentic Workflow project that automatically collects daily update information from major Microsoft and GitHub blogs and generates date-organized pages and an Astro website.

This repository serves as both a production-ready update tracking system and a demo implementation of GitHub Agentic Workflows.

## 📚 Documentation

- **`docs/DETAILED_DESIGN.md`** - System architecture design (Japanese)
- **`docs/AGENT_INSTRUCTIONS.md`** - AI agent instructions (Japanese)
- **`docs/IMPLEMENTATION_PLAN.md`** - 4-week implementation plan (Japanese)
- **`docs/PROJECT_START_GUIDE.md`** - Project start guide (Japanese)

## 🚀 Quick Start

### Local development setup

```bash
# Install dependencies
npm install

# Fetch blogs
npm run fetch

# Detect diffs
npm run diff

# Generate markdown update pages
npm run generate

# Start the Astro website
npm run dev

# Run tests
npm test
```

### Development scripts

```bash
# Build the Astro site
npm run build

# Watch the fetch script
npm run dev:fetch

# Generate static HTML site (for GitHub Pages)
npm run build:static

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
| **Phase 3** (Week 3) | Astro website | ✅ Done |
| **Phase 4** (Week 4) | Testing, deployment & operationalization | ✅ Done |

## 🔁 GitHub Actions Workflows

| Workflow | Trigger | Description |
|----------|---------|-------------|
| `daily-blog-scan.yml` | Daily 0:00 UTC / Manual | Fetch -> diff -> generate -> create PR |
| `analyze-blogs.yml` | Manual / `workflow_call` | Fetch & analyze only |
| `build-astro-preview.yml` | Manual | Build Astro and upload the generated HTML artifact (`dist/`) |
| `publish-updates.yml` | Push to `main` / Manual | Build static site -> Deploy to GitHub Pages |

## 🧪 Testing

```bash
npm test
# -> 40 tests pass (using Node.js built-in test runner)
```

Test coverage:

- `tests/utils/date-utils.test.js` - Date utilities
- `tests/utils/cache-manager.test.js` - Cache management
- `tests/diff-analyzer.test.js` - Diff detection logic
- `tests/generate-daily-page.test.js` - Page generation helpers

## 🌐 GitHub Pages Deployment

1. Set repository Settings -> Pages -> Source to **GitHub Actions**
2. First, use Actions -> **Astro Preview Build** -> **Run workflow** to safely confirm that Astro generates the HTML output in `dist/`
3. Once that looks good, pushes to `main` that change `content/updates/` or Astro-related files automatically trigger `publish-updates.yml`
4. Daily operation does not need another scheduler: `daily-blog-scan.yml` already creates the daily PR, and merging that PR into `main` triggers `publish-updates.yml`
5. Manual deploy: Actions -> **Publish Updates to GitHub Pages** -> **Run workflow**

## 🛠️ Tech Stack

- Node.js 24
- TypeScript
- Astro
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
