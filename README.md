# MS Blogs Update Tracker

Microsoft と GitHub の主要ブログから毎日のアップデート情報を自動収集し、日付ごとに整理されたページを生成する Agentic Workflow プロジェクトです。

このリポジトリは、実運用を想定した更新追跡システムであると同時に、GitHub の Agentic Workflow のデモ実装を兼ねています。

## 📚 ドキュメント

- **`docs/DETAILED_DESIGN.md`** - システムアーキテクチャ設計書
- **`docs/AGENT_INSTRUCTIONS.md`** - AI エージェント指示書
- **`docs/IMPLEMENTATION_PLAN.md`** - 4 週間の実装計画
- **`docs/PROJECT_START_GUIDE.md`** - プロジェクト開始ガイド
- **`README-en.md`** - English quick start

## 🚀 クイックスタート

### ローカル開発環境構築

```bash
# 依存パッケージインストール
npm install

# ブログ取得
npm run fetch

# 差分検出
npm run diff

# Markdown 更新ページ生成
npm run generate

# Astro サイト起動（ローカル開発）
npm run dev

# テスト実行
npm test
```

### 開発用スクリプト

```bash
# Astro 本番ビルド
npm run build

# 取得スクリプトのウォッチ実行
npm run dev:fetch

# 静的 HTML サイト生成（GitHub Pages 用）
npm run build:static
```

### 対象ブログソース

- 🐙 GitHub Blog
- 💻 VSCode Blog
- ☁️ Azure Blog
- 📊 Microsoft 365 Blog
- 📈 Microsoft Fabric Blog
- 🤖 Microsoft AI Blog

## 📋 実装フェーズ

| Phase | 内容 | 状態 |
|-------|------|------|
| **Phase 1** (Week 1) | ブログ取得・差分検出スクリプト実装 | ✅ 完了 |
| **Phase 2** (Week 2) | GitHub Actions ワークフロー & AI 統合 | ✅ 完了 |
| **Phase 3** (Week 3) | 静的サイト生成スクリプト実装 | ✅ 完了 |
| **Phase 4** (Week 4) | テスト・デプロイ・運用化 | ✅ 完了 |

## 🔁 GitHub Actions ワークフロー

| ワークフロー | トリガー | 概要 |
|------------|---------|------|
| `daily-blog-scan.yml` | 毎日 0:00 UTC / 手動 | ブログ取得→差分検出→ページ生成→PR 作成 |
| `analyze-blogs.yml` | 手動 / `workflow_call` | ブログ取得・解析のみ |
| `publish-updates.yml` | `main` ブランチ push / 手動 | 静的サイトビルド→GitHub Pages デプロイ |

## 🧪 テスト

```bash
npm test
# → 40 テスト全件パス（Node.js 組み込みテストランナー使用）
```

テスト対象:

- `tests/utils/date-utils.test.js` — 日付ユーティリティ
- `tests/utils/cache-manager.test.js` — キャッシュ管理
- `tests/diff-analyzer.test.js` — 差分検出ロジック
- `tests/generate-daily-page.test.js` — ページ生成ヘルパー

## 🌐 GitHub Pages デプロイ

1. リポジトリの Settings → Pages → Source を **GitHub Actions** に設定
2. `main` ブランチに `content/updates/` の変更が push されると自動デプロイ
3. 手動デプロイ: Actions タブ → "Publish Updates to GitHub Pages" → "Run workflow"

## 🛠️ 技術スタック

- Node.js 24
- GitHub Actions / Agentic Workflows
- cheerio（HTML パース）
- rss-parser（RSS パース）
- Node.js 組み込みテストランナー（`node:test`）

## 📖 詳細ドキュメント

実装詳細は `docs/` ディレクトリのドキュメントを参照してください。

---

**プロジェクト名**: MS Blogs Update Tracker  
**開始日**: 2026-06-20  
**状態**: ✅ Production Ready (Phase 4 完了)
