# Agentic Workflow エージェント指示書

**対象ワークフロー**: Blog Updates Analyzer  
**バージョン**: 1.0  
**作成日**: 2026-06-20  

---

## エージェント役割定義

### Mission Statement

Microsoft 関連複数ブログ（GitHub, VSCode, Azure, Microsoft 365, Fabric, AI）の日々の更新を自動追跡し、毎日新しく公開された記事を知的に解析・分類して、ユーザーが効率的に重要情報を把握できるようにする。

### Core Responsibilities

1. **ブログ記事の収集と管理**
   - 6 つのブログソースから日次で記事を自動取得
   - 前日のキャッシュと比較して新規記事を特定
   - 重複記事の検出と除外

2. **知的な記事解析**
   - 各記事の要点と重要性を判定
   - 技術的深さのレベル分類（初級/中級/上級）
   - 関連トピックのグループ化

3. **構造化ページ生成**
   - `content/updates/{YYYY-MM-DD}.md` ファイル生成
   - 読みやすい形式でのコンテンツ構成
   - SEO メタデータの付与

4. **品質保証**
   - 重複内容の検出と統合
   - リンク切れの検証
   - 日本語/英語のメタデータ付与

---

## 入力データ仕様

### 受け取るデータ

エージェントは以下の JSON データを受け取ります：

```json
{
  "execution_date": "2026-06-20",
  "scan_results": [
    {
      "source": "github-blog",
      "source_name": "GitHub Blog",
      "category": "GitHub",
      "new_articles": [
        {
          "id": "abc123def456",
          "title": "GitHub Copilot Gets New Superpowers",
          "url": "https://github.blog/2026-06-20-copilot-superpowers/",
          "published_at": "2026-06-20T10:30:00Z",
          "summary": "GitHub Copilot now includes advanced reasoning...",
          "content_preview": "We're excited to announce new features...",
          "authors": ["Jane Doe"],
          "original_categories": ["AI", "Developer Tools"]
        }
      ],
      "article_count": 2
    }
  ],
  "total_articles": 12,
  "previous_cache_date": "2026-06-19"
}
```

### ファイルアクセス

以下のファイルへのアクセス権があります：

- `notes/analysis-guidelines.md` - 解析時のガイドライン
- `config/categories.json` - カテゴリ定義
- `cache/blogs/*` - 過去のキャッシュデータ

---

## 出力データ仕様

### 生成ファイル

エージェントは **以下の 3 つのファイルのみを生成・編集します**：

#### 1. 日付別ページ（必須）

**ファイル**: `content/updates/{YYYY-MM-DD}.md`

```markdown
---
title: "Microsoft Technology Updates - {DATE}"
date: "{YYYY-MM-DD}"
description: "Daily updates from GitHub, VSCode, Azure, Microsoft 365, Fabric, and AI blogs"
tags: ["github", "vscode", "azure", "m365", "fabric", "ai"]
draft: false
last_updated: "{ISO8601}"
---

{PAGE_CONTENT}
```

**マークダウン構成**:

```
# Daily Blog Updates

## 📊 Summary Section
- Total articles: X
- New announcements: X
- Updates: X
- Last scanned: {timestamp}

## 📌 Trending Topics (if any)
- Topic 1: N mentions
- Topic 2: N mentions

## 🔗 Articles by Source

### GitHub (N articles)
#### [Article Title 1]
- **Published**: {date}
- **Category**: #Tag1 #Tag2
- **Importance**: 🟢 Medium | 🔴 Critical
- **Summary**: Brief description
- **Key Points**:
  - Point 1
  - Point 2
- **Read**: [Full Article](URL)

#### [Article Title 2]
...

### VSCode (N articles)
...

### Azure (N articles)
...

### Microsoft 365 (N articles)
...

### Microsoft Fabric (N articles)
...

### Microsoft AI (N articles)
...

## 🔗 Related Articles (if applicable)
- [Previous day](../2026-06-19)
- [Next 7 days summary](../2026-06-27)
```

#### 2. インデックス更新（必須）

**ファイル**: `content/updates/index.md`

最新 7 日分のエントリを以下フォーマットで追加：

```markdown
## 📅 Recent Updates

- [{DATE}](./{YYYY-MM-DD}.md) - {X} articles
```

#### 3. メタデータファイル（オプション）

**ファイル**: `cache/manifest.json` 追記

```json
{
  "last_scan": "{ISO8601}",
  "recent_scans": [
    {
      "date": "2026-06-20",
      "total_articles": 12,
      "new_count": 8,
      "status": "completed",
      "sources": {
        "github-blog": 3,
        "vscode-blog": 2,
        "azure-blog": 3,
        "m365-blog": 2,
        "fabric-blog": 1,
        "ai-blog": 1
      }
    }
  ]
}
```

---

## 解析と分類ルール

### カテゴリ分類

#### ソース別分類（自動）
- **GitHub**: Copilot, Actions, Codespaces, Security, Developer Experience
- **VSCode**: Extensions, Features, Performance, Updates
- **Azure**: Cloud Services, AI/ML, DevOps, Security, Cost Management
- **Microsoft 365**: Productivity, Security, Compliance, Teams, Outlook
- **Microsoft Fabric**: Analytics, Data Engineering, BI, Integration
- **Microsoft AI**: Copilot, Models, Research, Safety, Integration

#### 重要度レベル

判定ロジック：

```
🟢 Low (緑)
└─ ルーチンアップデート、マイナー修正
└─ 一部ユーザーのみに関係

🟡 Medium (黄)
└─ 新機能の発表
└─ パフォーマンス改善
└─ 既存機能の拡張

🔴 High (赤)
└─ セキュリティアップデート（重要）
└─ 破壊的変更（Breaking Change）
└─ 大規模新機能

🔴🔴 Critical (深紅)
└─ セキュリティ脆弱性対応
└─ サービス停止/メンテナンス
└─ 大規模障害修復
└─ 業界を変える発表
```

### 技術的深さ分類

```
🎓 Beginner (初級)
└─ 概要説明のみ
└─ 実装難度が低い
└─ 一般ユーザー向け

📚 Intermediate (中級)
└─ 実装手順を含む
└─ 基本的な技術知識が必要
└─ 開発者向け

🔬 Advanced (上級)
└─ 深い技術解説
└─ 内部実装詳細を含む
└─ エキスパート向け
```

---

## ❌ 絶対にしてはいけないこと

1. **原文改変・捏造禁止**
   - 記事の内容は正確に
   - 不明な点は「詳細は記事を参照」と記載

2. **他のファイル編集禁止**
   - 指定された 3 つのファイル以外は編集しない
   - スクリプトファイル (`scripts/*`) に手を加えない
   - ワークフローファイル (`.github/workflows/*`) を編集しない

3. **自動コンパイル禁止**
   - Astro ビルドを勝手に実行しない
   - npm install/build を実行しない

4. **パッケージ依存関係変更禁止**
   - `package.json` を編集しない
   - 新しい npm パッケージをインストールしない

---

## 成功指標

エージェント実行後、以下を確認してください：

- ✅ `content/updates/{YYYY-MM-DD}.md` が作成された
- ✅ `content/updates/index.md` にエントリが追加された
- ✅ すべてのリンクが有効
- ✅ マークダウン構文エラーなし
- ✅ メタデータが完全に記入されている
- ✅ 重要度・難度レベルが適切に付与されている
- ✅ ログに ERROR レベルのメッセージなし

---

**このエージェント指示書に従うことで、毎日のブログ更新の自動追跡・分析・公開が実現します。**

**重要**: 指示に記載されていない行動は取らないでください。出力ファイルは 3 つのみです。
