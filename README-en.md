# MS Blogs Update Tracker

An Agentic Workflow project that collects daily updates from major Microsoft and GitHub blogs and publishes them as date-based pages and an Astro website.

This repository is both a production-oriented update tracking system and a demo implementation for GitHub Agentic Workflows.

## 📚 Documentation

- **`docs/DETAILED_DESIGN.md`** - System architecture design
- **`docs/AGENT_INSTRUCTIONS.md`** - AI agent instructions
- **`docs/IMPLEMENTATION_PLAN.md`** - Four-week implementation plan
- **`docs/PROJECT_START_GUIDE.md`** - Project start guide

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
```

### Development scripts

```bash
# Build the Astro site
npm run build

# Watch the fetch script
npm run dev:fetch
```

### Target blog sources

- 🐙 GitHub Blog
- 💻 VSCode Blog
- ☁️ Azure Blog
- 📊 Microsoft 365 Blog
- 📈 Microsoft Fabric Blog
- 🤖 Microsoft AI Blog

## 📋 Implementation Phases

- **Phase 1** (Week 1): Blog fetch and diff detection scripts
- **Phase 2** (Week 2): GitHub Actions workflows and AI integration
- **Phase 3** (Week 3): Astro website
- **Phase 4** (Week 4): Testing, deployment, and operations

## 🛠️ Technology Stack

- Node.js 18+
- TypeScript
- GitHub Actions
- Agentic Workflows
- Astro
- cheerio (HTML parsing)
- feed-parser (RSS parsing)

## 📖 More Details

See the documents under `docs/` for full implementation details.

---

**Project**: MS Blogs Update Tracker  
**Start Date**: 2026-06-20  
**Status**: Development (Phase 3)
