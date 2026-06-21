# Microsoft ブログ差分追跡システム - 詳細設計書

**プロジェクト名**: MS Blogs Update Tracker  
**バージョン**: 1.0  
**作成日**: 2026-06-20  
**最終更新**: 2026-06-20

---

## 目次

1. [プロジェクト概要](#プロジェクト概要)
2. [システムアーキテクチャ](#システムアーキテクチャ)
3. [技術スタック](#技術スタック)
4. [詳細実装仕様](#詳細実装仕様)
5. [ワークフロー設計](#ワークフロー設計)
6. [データモデル](#データモデル)
7. [実装計画](#実装計画)

---

## プロジェクト概要

### ビジネス目標

Microsoft と GitHub の主要ブログから毎日のアップデート情報を自動収集し、日付ごとに整理されたページを生成することで、ユーザーが重要な更新情報を効率的に追跡できるようにする。

### 対象ブログソース

| ブログ名              | URL                                                                       | 更新頻度 | 取得方法       |
| --------------------- | ------------------------------------------------------------------------- | -------- | -------------- |
| GitHub Blog           | https://github.blog                                                       | RSS      | RSS フィード   |
| VSCode Blog           | https://code.visualstudio.com/blogs                                       | HTML     | スクレイピング |
| Azure Blog            | https://azure.microsoft.com/en-us/blog/                                   | RSS      | RSS フィード   |
| Microsoft 365 Blog    | https://www.microsoft.com/en-us/microsoft-365/business/microsoft-365-blog | HTML     | スクレイピング |
| Microsoft Fabric Blog | https://powerbi.microsoft.com/en-us/blog/                                 | RSS      | RSS フィード   |
| Microsoft AI Blog     | https://blogs.microsoft.com/ai/                                           | RSS      | RSS フィード   |

### 主要な特徴

✅ **毎日自動実行**: GitHub Actions スケジュール  
✅ **差分検出**: 前日のキャッシュと比較して新規記事のみ抽出  
✅ **AI 解析**: Agentic Workflow による知的なサマリー生成  
✅ **日付別ページ生成**: `content/updates/{YYYY-MM-DD}.md` の自動生成  
✅ **PR ベースレビュー**: 生成された内容を PR で確認可能  
✅ **Web サイト化**: Astro で Web サイトとしてデプロイ可能

---

## システムアーキテクチャ

### 全体構成図

```
┌─────────────────────────────────────────────────────────┐
│  GitHub Actions - Daily Blog Scan (毎日 8:00 JST)      │
└────────────────────┬────────────────────────────────────┘
                     ↓
        ┌────────────────────────────┐
        │ 1. Fetch Blog Updates      │
        │ (fetch-blogs.js)           │
        └────────────┬───────────────┘
                     ↓
     ┌───────────────────────────────────────┐
     │ GitHub Blog │ VSCode Blog │ Azure ... │
     └───────────────────────────────────────┘
                     ↓
        ┌────────────────────────────┐
        │ 2. Detect Differences      │
        │ (diff-analyzer.js)         │
        │ - キャッシュ比較            │
        │ - 新記事の抽出             │
        └────────────┬───────────────┘
                     ↓
        ┌────────────────────────────┐
        │ 3. Generate Agentic WF     │
        │ 動的ワークフロー生成        │
        └────────────┬───────────────┘
                     ↓
        ┌────────────────────────────┐
        │ 4. AI Agent Analysis       │
        │ (Agentic Workflow)         │
        │ - サマリー生成             │
        │ - 分類・タグ付け          │
        └────────────┬───────────────┘
                     ↓
        ┌────────────────────────────┐
        │ 5. Create Daily Page       │
        │ content/updates/YYYY-MM-DD │
        └────────────┬───────────────┘
                     ↓
        ┌────────────────────────────┐
        │ 6. Create Pull Request     │
        │ レビュー用 PR 作成         │
        └────────────┬───────────────┘
                     ↓
        ┌────────────────────────────┐
        │ 7. Auto-Merge (Optional)   │
        │ main ブランチへマージ       │
        └────────────────────────────┘
```

### 主要コンポーネント

#### A. ブログ取得エンジン (`scripts/fetch-blogs.js`)

**責務**:

- 各ブログの最新記事を取得
- RSS フィード/HTML スクレイピングを統一インターフェースで提供
- 取得データを JSON キャッシュとして保存

**入力**: ブログ設定（URL、タイプ）  
**出力**: `cache/blogs/{source-name}-{YYYY-MM-DD}.json`

スケジュール実行時は日本時間の日付を対象日として渡し、`cache/blogs` の日次スナップショットを PR に含める。これにより翌日の差分検出で前日キャッシュを利用できる。

**処理フロー**:

```javascript
for each blog source:
  1. RSS/HTML から記事取得
  2. タイトル、URL、日時、要約を抽出
  3. JSON ファイルとして保存
  4. stdout に JSON 出力（CI/CD 用）
```

#### B. 差分検出エンジン (`scripts/diff-analyzer.js`)

**責務**:

- 前日のキャッシュと本日のキャッシュを比較
- 新規記事を特定
- 削除/更新記事を検出

**入力**:

- `cache/blogs/{source-name}-{YESTERDAY}.json`
- `cache/blogs/{source-name}-{TODAY}.json`

**出力**:

```json
{
  "source": "github-blog",
  "date": "2026-06-20",
  "new_articles": [
    {
      "id": "unique-hash",
      "title": "Article Title",
      "url": "https://...",
      "published_at": "2026-06-20T10:30:00Z",
      "summary": "Short summary from RSS"
    }
  ],
  "total_new": 5
}
```

#### C. Agentic Workflow 生成エンジン

**責務**:

- 差分検出結果をもとに動的ワークフロー MD ファイル生成
- AI エージェント用のプロンプト構築

**出力**: `.github/workflows/analyze-{YYYY-MM-DD}.md`

#### D. AI エージェント (`blog-diff-analyzer.md`)

**責務**:

- 各記事の詳細解析
- 意味のあるサマリーとキーポイント生成
- カテゴリ/タグ付け
- 関連記事のグループ化

#### E. ページ生成エンジン

**責備**:

- `content/updates/{YYYY-MM-DD}.md` 生成
- インデックスページ更新（最新 7 日分表示）

---

## 技術スタック

### 言語・フレームワーク

```
Frontend/Content:
  - Astro 4.0+ (Web サイト生成)
  - MDX (マークダウン + コンポーネント)
  - TypeScript (型安全性)

Backend/Automation:
  - GitHub Actions (オーケストレーション)
  - Node.js 18+ (スクリプト)
  - Agentic Workflows (AI 駆動)

Data Processing:
  - cheerio (HTML パース)
  - feed-parser (RSS パース)
  - crypto (ハッシング・キャッシュキー)

CI/CD:
  - GitHub Actions
  - Act (ローカルテスト)
```

### 依存パッケージ

```json
{
  "dependencies": {
    "astro": "^4.0.0",
    "cheerio": "^1.0.0",
    "feedparser": "^2.2.11",
    "axios": "^1.6.0",
    "@github/browser-ssg": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "prettier": "^3.0.0",
    "eslint": "^8.0.0"
  }
}
```

---

**設計書のその他のセクションは実装計画を参照してください**
