# 実装計画 & タスクリスト

**プロジェクト**: Blog Updates Tracker  
**開始日**: 2026-06-20  
**目標完了**: 2026-07-18（4 週間）  

---

## Phase 1: 基盤設定 & 環境構築（Week 1）

### Week 1 目標
- GitHub リポジトリ作成
- プロジェクト構造初期化
- ブログ取得スクリプト実装完了
- 差分検出ロジック実装完了

### Tasks

#### 1.1 GitHub リポジトリ初期化

**Task**: リポジトリ作成と基本セットアップ  
**所要時間**: 1 時間  
**チェックリスト**:
- [ ] GitHub 新規リポジトリ作成（public）
- [ ] リポジトリ名: `blog-updates-tracker`
- [ ] 説明: "Automated daily blog tracking for Microsoft & GitHub"
- [ ] README.md 初期化
- [ ] LICENSE 追加（MIT）
- [ ] .gitignore 作成
- [ ] local にクローン

#### 1.2 Node.js プロジェクト設定

**Task**: npm セットアップ、依存パッケージ管理  
**所要時間**: 30 分  
**チェックリスト**:
- [ ] `npm init -y` で package.json 初期化
- [ ] TypeScript インストール: `npm install -D typescript`
- [ ] ESLint インストール: `npm install -D eslint @typescript-eslint/parser`
- [ ] Prettier インストール: `npm install -D prettier`
- [ ] ブログ取得用パッケージ: `npm install axios cheerio feed-parser`
- [ ] 開発用: `npm install -D ts-node nodemon`
- [ ] `tsconfig.json` 作成
- [ ] `.prettierrc` 作成
- [ ] `.eslintrc.json` 作成

**package.json scripts**:
```json
{
  "scripts": {
    "dev": "ts-node scripts/fetch-blogs.ts",
    "fetch": "node scripts/fetch-blogs.js",
    "diff": "node scripts/diff-analyzer.js",
    "generate": "node scripts/generate-daily-page.js",
    "lint": "eslint .",
    "format": "prettier --write ."
  }
}
```

#### 1.3 ディレクトリ構造作成

**Task**: プロジェクト全体のフォルダ構成初期化  
**所要時間**: 30 分  
**作成するディレクトリ**:
```
blog-updates-tracker/
├── scripts/              # 処理スクリプト
│   ├── fetch-blogs.js
│   ├── diff-analyzer.js
│   ├── generate-daily-page.js
│   ├── generate-agentic-workflow.js
│   └── utils/
│       ├── logger.js
│       ├── cache-manager.js
│       └── date-utils.js
├── config/               # 設定ファイル
│   ├── blog-sources.json
│   └── categories.json
├── cache/                # ブログキャッシュ
│   ├── blogs/
│   └── manifest.json
├── content/              # 生成コンテンツ
│   ├── updates/
│   │   └── index.md
│   └── category/
├── .github/              # GitHub 設定
│   ├── workflows/
│   │   ├── daily-blog-scan.yml
│   │   ├── analyze-blogs.yml
│   │   └── publish-updates.yml
│   ├── agents/
│   │   └── blog-diff-analyzer.md
│   ├── prompts/
│   │   └── analyze-blog-updates.prompt.md
│   ├── mcp.json
│   └── steps/            # ラーニングステップ（オプション）
├── docs/                 # ドキュメント
│   ├── blog-sources.md
│   ├── architecture.md
│   └── troubleshooting.md
├── tests/                # テストファイル
│   ├── fetch-blogs.test.js
│   └── diff-analyzer.test.js
├── .env.example          # 環境変数テンプレート
├── package.json
├── tsconfig.json
├── .prettierrc
├── .eslintrc.json
└── .gitignore
```

**チェックリスト**:
- [ ] すべてのディレクトリ作成
- [ ] git add & commit

---

#### 1.4 ブログソース設定

**Task**: `config/blog-sources.json` 作成  
**所要時間**: 1 時間  

**チェックリスト**:
- [ ] すべてのブログ URL 動作確認
- [ ] RSS フィード有効性確認
- [ ] セレクター精度テスト

---

#### 1.5 ブログ取得スクリプト実装

**Task**: `scripts/fetch-blogs.js` の基本実装  
**所要時間**: 3 時間  
**要件**:
- RSS フィード取得（4 ソース）
- HTML スクレイピング（2 ソース）
- データ正規化
- キャッシュ保存

**実装ステップ**:

1. **Base Fetcher Class 作成**
```javascript
class BaseFetcher {
  constructor(source) {
    this.source = source;
    this.cache = null;
  }
  
  async fetch() {
    // 実装サブクラスで
  }
  
  async saveCache() {
    // JSON ファイル保存
  }
}
```

2. **RSS Fetcher 実装**
```javascript
class RSSFetcher extends BaseFetcher {
  async fetch() {
    // feedparser で取得
  }
}
```

3. **HTML Scraper 実装**
```javascript
class HTMLScraper extends BaseFetcher {
  async fetch() {
    // cheerio で取得
  }
}
```

4. **Article Normalizer**
```javascript
function normalizeArticle(raw) {
  return {
    id: hashURL(raw.url),
    title: raw.title,
    url: raw.url,
    published_at: parseDate(raw.date),
    summary: raw.summary || '',
    // ...
  };
}
```

**テスト**:
```bash
node scripts/fetch-blogs.js
# 出力確認: cache/blogs/ に JSON ファイルが生成されるか
```

**チェックリスト**:
- [ ] RSS フィード取得テスト成功
- [ ] HTML スクレイピング成功
- [ ] キャッシュファイル生成成功
- [ ] 手動実行で 10+ 記事取得確認
- [ ] エラーハンドリング実装

---

#### 1.6 差分検出スクリプト実装

**Task**: `scripts/diff-analyzer.js` 実装  
**所要時間**: 2 時間  
**要件**:
- 前日キャッシュ取得
- 本日キャッシュ比較
- 新規記事特定
- 差分 JSON 出力

**実装**:

```javascript
class DiffAnalyzer {
  async analyze(today, yesterday) {
    // 1. ファイル読み込み
    const todayData = await loadCache(today);
    const yesterdayData = await loadCache(yesterday);
    
    // 2. URL セット化
    const todayURLs = new Set(todayData.map(a => a.url));
    const yesterdayURLs = new Set(yesterdayData.map(a => a.url));
    
    // 3. 新規記事特定
    const newArticles = todayData.filter(a => !yesterdayURLs.has(a.url));
    
    // 4. 削除記事特定
    const removedArticles = yesterdayData.filter(a => !todayURLs.has(a.url));
    
    // 5. 結果出力
    return {
      date: today,
      new_count: newArticles.length,
      removed_count: removedArticles.length,
      new_articles: newArticles,
      diff_result: true
    };
  }
}
```

**テスト**:
```bash
node scripts/diff-analyzer.js
# 出力: diff-result.json に差分結果が保存されるか確認
```

**チェックリスト**:
- [ ] 差分検出ロジック実装
- [ ] 新規記事正確に抽出
- [ ] 重複除外機能実装
- [ ] テスト実行成功
- [ ] diff-result.json 出力確認

---

### Week 1 デリバリー

- ✅ リポジトリ作成完了
- ✅ Node.js プロジェクト初期化完了
- ✅ ブログ取得スクリプト実装・テスト完了
- ✅ 差分検出スクリプト実装・テスト完了
- ✅ ローカル手動実行で動作確認

---

## Phase 2: ワークフロー & AI 統合（Week 2）

### Week 2 目標
- GitHub Actions ワークフロー作成
- Agentic Workflow エージェント定義
- ページ生成スクリプト実装
- エンドツーエンドテスト

### Tasks

#### 2.1 GitHub Actions ワークフロー実装

**Task**: `.github/workflows/daily-blog-scan.yml` 作成  
**所要時間**: 2 時間  

**チェックリスト**:
- [ ] YAML 構文正確
- [ ] permissions 正確に設定
- [ ] 手動トリガー動作確認
- [ ] artifact アップロード確認

---

#### 2.2 Agentic Workflow エージェント定義

**Task**: `.github/agents/blog-diff-analyzer.md` 作成  
**所要時間**: 2 時間  

**参照**: AGENT_INSTRUCTIONS.md

**チェックリスト**:
- [ ] エージェント MD ファイル作成
- [ ] MCP.json 設定（ネットワークアクセス）
- [ ] GitHub にアップロード

---

#### 2.3 ページ生成スクリプト実装

**Task**: `scripts/generate-daily-page.js` 実装  
**所要時間**: 3 時間  

**チェックリスト**:
- [ ] マークダウン生成機能実装
- [ ] メタデータ付与機能実装
- [ ] インデックス更新機能実装
- [ ] テスト実行成功

---

### Week 2 デリバリー

- ✅ GitHub Actions ワークフロー作成・テスト完了
- ✅ Agentic Workflow エージェント定義完了
- ✅ ページ生成スクリプト実装完了
- ✅ MCP 設定完了
- ✅ エンドツーエンドテスト（手動トリガー）完了

---

## Phase 3: Web サイト化 & UI 構築（Week 3）

### Week 3 目標
- Astro プロジェクト初期化
- マークダウン コレクション設定
- Web UI コンポーネント実装
- ローカルプレビュー確認

---

## Phase 4: テスト & 運用化（Week 4）

### Week 4 目標
- エンドツーエンドテスト実行
- 本番ワークフロー設定
- デプロイ設定
- ローンチ準備

---

## ローンチチェックリスト

本番運用開始前に以下を確認してください：

### コード品質
- [ ] すべてのテスト成功
- [ ] ESLint エラーなし
- [ ] TypeScript エラーなし
- [ ] コードレビュー完了

### 機能確認
- [ ] ブログ取得： 6 ソースすべて取得可能
- [ ] 差分検出： 重複なく新規記事抽出
- [ ] ページ生成： マークダウン形式正確
- [ ] AI エージェント： 意味のあるサマリー生成
- [ ] Web サイト： 全ページ表示可能

### 運用準備
- [ ] GitHub Pages 公開確認
- [ ] ワークフロー スケジュール設定確認
- [ ] ドキュメント完成
- [ ] バックアップ戦略確定

---

**作成日**: 2026-06-20  
**次回レビュー**: 2026-07-04  

詳細は docs/ ディレクトリの各ドキュメントを参照してください。
