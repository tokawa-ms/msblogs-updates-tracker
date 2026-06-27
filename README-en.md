# MS Blogs Update Tracker

A project that automatically collects daily update information from major Microsoft and GitHub blogs, then generates date-organized pages and an Astro website.

This repository is a production-oriented update tracking system built with standard GitHub Actions workflows.

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
```

### Target blog sources

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
| **Phase 2** (Week 2) | GitHub Actions workflow setup | ✅ Done |
| **Phase 3** (Week 3) | Astro website | ✅ Done |
| **Phase 4** (Week 4) | Testing, deployment & operationalization | ✅ Done |

## 🔁 GitHub Actions Workflows

| Workflow | Trigger | Description |
|----------|---------|-------------|
| `daily-blog-scan.yml` | Daily 23:00 UTC (08:00 JST) / Manual | Fetch -> diff -> generate -> auto-commit to `main` -> publish to GitHub Pages |
| `analyze-blogs.yml` | Manual / `workflow_call` | Fetch & analyze only |
| `publish-updates.yml` | Push to `main` / Manual | Build Astro and publish to GitHub Pages |

## 🧪 Testing

```bash
npm test
# -> all tests pass (using Node.js built-in test runner)
```

Test coverage:

- `tests/utils/date-utils.test.js` - Date utilities
- `tests/utils/cache-manager.test.js` - Cache management
- `tests/diff-analyzer.test.js` - Diff detection logic
- `tests/generate-daily-page.test.js` - Page generation helpers

## 🌐 GitHub Pages Deployment

1. In Settings -> Pages -> **Build and deployment**, choose **GitHub Actions**
2. In Actions -> **Publish Updates to GitHub Pages** -> **Run workflow**, first run with `build_only = true` to confirm Astro HTML output safely
3. If that passes, run with `build_only = false`, or push changes to `main` that affect `content/updates/` or Astro-related files for automatic deployment
4. Daily operation needs no manual merge: `daily-blog-scan.yml` checks for updates at 08:00 JST, commits changes directly to `main`, and publishes to GitHub Pages when changes are detected
5. For automatic commits from `daily-blog-scan.yml`, enable Read and write permissions in Actions **Workflow permissions** and adjust branch protection as needed so `github-actions[bot]` can push to `main`.
6. The published URL is `https://tokawa-ms.github.io/msblogs-updates-tracker/`

## 🛠️ Tech Stack

- Node.js 24
- TypeScript
- Astro
- GitHub Actions (standard workflows)
- cheerio (HTML parsing)
- rss-parser (RSS parsing)
- Node.js built-in test runner (`node:test`)

## 📖 Detailed Documentation

See the `docs/` directory for implementation details.

---

**Project**: MS Blogs Update Tracker  
**Start Date**: 2026-06-20  
**Status**: ✅ Production Ready (Phase 4 complete)
