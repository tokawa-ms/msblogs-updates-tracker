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
| `daily-blog-scan.yml` | 毎日 23:00 UTC（日本時間 8:00）/ 手動 | ブログ取得→差分検出→ページ生成→PR 作成 |
| `analyze-blogs.yml` | 手動 / `workflow_call` | ブログ取得・解析のみ |
| `publish-updates.yml` | `main` ブランチ push / 手動 | Astro をビルドして `gh-pages` ブランチへ公開 |

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

1. リポジトリの Settings → Pages → **Build and deployment** で **GitHub Actions** を選択
2. Actions タブ → **Publish Updates to GitHub Pages** → **Run workflow** で、まず `build_only = true` を実行し Astro の HTML 出力だけを確認
3. 問題なければ `build_only = false` で実行、または `main` ブランチに `content/updates/` / Astro 関連ファイルの変更を push すると自動デプロイ
4. 日次運用は `daily-blog-scan.yml` が日本時間 8:00 に PR を作成し、その PR を `main` に取り込むと `publish-updates.yml` が続けて動くため、追加設定は不要
5. 公開 URL は `https://tokawa-ms.github.io/msblogs-updates-tracker/`

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
