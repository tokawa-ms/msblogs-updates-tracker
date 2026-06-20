# Blog Updates Tracker

Microsoft と GitHub の主要ブログから毎日のアップデート情報を自動収集し、日付ごとに整理されたページを生成する Agentic Workflow プロジェクトです。

## 📚 ドキュメント

- **`docs/DETAILED_DESIGN.md`** - システムアーキテクチャ設計書
- **`docs/AGENT_INSTRUCTIONS.md`** - AI エージェント指示書
- **`docs/IMPLEMENTATION_PLAN.md`** - 4 週間の実装計画
- **`docs/PROJECT_START_GUIDE.md`** - プロジェクト開始ガイド

## 🚀 クイックスタート

### ローカル開発環境構築

```bash
# 依存パッケージインストール
npm install

# ブログ取得テスト
npm run fetch

# 差分検出テスト  
npm run diff
```

### 対象ブログソース

- 🐙 GitHub Blog
- 💻 VSCode Blog
- ☁️ Azure Blog
- 📊 Microsoft 365 Blog
- 📈 Microsoft Fabric Blog
- 🤖 Microsoft AI Blog

## 📋 実装フェーズ

- **Phase 1** (Week 1): ブログ取得・差分検出スクリプト実装
- **Phase 2** (Week 2): GitHub Actions ワークフロー & AI 統合
- **Phase 3** (Week 3): Astro Web サイト化
- **Phase 4** (Week 4): テスト・デプロイ・運用化

## 🛠️ 技術スタック

- Node.js 18+
- TypeScript
- GitHub Actions
- Agentic Workflows
- Astro
- cheerio (HTML parsing)
- feed-parser (RSS parsing)

## 📖 詳細ドキュメント

実装詳細は `docs/` ディレクトリのドキュメントを参照してください。

---

**プロジェクト名**: Blog Updates Tracker  
**開始日**: 2026-06-20  
**状態**: Development (Phase 1)
