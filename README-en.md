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
| `publish-updates.yml` | Push to `main` / Manual | Build Astro and publish the output to the `gh-pages` branch |

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

1. In Settings -> Pages -> **Build and deployment**, choose **Deploy from a branch**
2. Set the branch to **`gh-pages` / `(root)`**
3. First, use Actions -> **Publish Updates to GitHub Pages** -> **Run workflow** with `build_only = true` to safely confirm that Astro generates the HTML output
4. Once that looks good, run it normally with `build_only = false`, or push changes to `main` that affect `content/updates/` or Astro-related files to publish to `gh-pages` automatically
5. Daily operation does not need another scheduler: `daily-blog-scan.yml` already creates the daily PR, and merging that PR into `main` triggers `publish-updates.yml`
6. The published URL is `https://tokawa-ms.github.io/msblogs-updates-tracker/`

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
