# MS Blogs Update Tracker - プロジェクト開始ガイド

**プロジェクト名**: MS Blogs Update Tracker  
**目標**: Microsoft/GitHub ブログの毎日の差分追跡・自動キュレーション  
**実装期間**: 4 週間（2026-06-20 ～ 2026-07-18）  
**チーム**: 1 人（AI Assistant + ユーザー）

---

## 📚 ドキュメント一覧

このセッションで作成されたドキュメントは以下の通りです：

### 1. **DETAILED_DESIGN.md** ⭐ 必読

- プロジェクト概要・ビジョン
- システムアーキテクチャ（全体図）
- 技術スタック詳細
- データモデル定義
- ワークフロー設計
- 実装ポイント解説

### 2. **AGENT_INSTRUCTIONS.md** ⭐ 必読

- Agentic Workflow エージェント定義
- エージェントの役割と責任
- 入力/出力データ仕様
- 記事解析ルール（重要度・難度分類）
- 出力フォーマット・スタイルガイド
- エラーハンドリング

### 3. **IMPLEMENTATION_PLAN.md** ⭐ 必読

- Phase 別タスク分解（4 週間）
- 各タスク詳細（時間・チェックリスト付き）
- 実装サンプルコード
- テストシナリオ
- ローンチチェックリスト

---

## 🚀 今からできること

### すぐ実装開始できる状態です！

#### ステップ 1: ローカル環境確認（済み）

```bash
✅ ローカル Git リポジトリ作成
✅ ディレクトリ構造作成
✅ npm パッケージインストール
```

#### ステップ 2: IMPLEMENTATION_PLAN.md で Next Tasks を確認

**Phase 1 - Task 1.1 ～ 1.6**:

- Task 1.1: リポジトリ初期化
- Task 1.2: Node.js プロジェクト設定
- Task 1.3: ディレクトリ構造作成
- Task 1.4: ブログソース設定
- Task 1.5: ブログ取得スクリプト実装
- Task 1.6: 差分検出スクリプト実装

#### ステップ 3: GitHub リポジトリ作成（任意）

```bash
# GitHub に公開したい場合：
git remote add origin https://github.com/<your-username>/msblogs-updates-tracker.git
git push -u origin master
```

#### ステップ 4: ブログ取得スクリプト実装開始

**IMPLEMENTATION_PLAN.md の Phase 1 - Task 1.5 参照**

```bash
# スクリプト作成後の実行テスト：
npm run fetch
npm run diff
```

---

## 📋 フェーズ別チェックリスト

### ✅ Phase 1 完了チェック（Week 1）

- [ ] GitHub リポジトリ作成
- [ ] Node.js プロジェクト初期化
- [ ] `fetch-blogs.js` 実装・テスト
- [ ] `diff-analyzer.js` 実装・テスト
- [ ] ローカル動作確認（10+ 記事取得）

**期待結果**: ローカルで `cache/blogs/*.json` が生成される

---

### ✅ Phase 2 完了チェック（Week 2）

- [ ] GitHub Actions ワークフロー作成
- [ ] Agentic Workflow エージェント定義
- [ ] `.github/mcp.json` 設定
- [ ] `generate-daily-page.js` 実装
- [ ] エンドツーエンドテスト

**期待結果**: GitHub Actions で手動実行 → `main` への自動コミットと GitHub Pages 公開完了

---

### ✅ Phase 3 完了チェック（Week 3）

- [ ] Astro プロジェクト初期化
- [ ] マークダウンコレクション設定
- [ ] Web UI 実装
- [ ] ローカルプレビュー確認

**期待結果**: `npm run dev` でサイト表示確認

---

### ✅ Phase 4 完了チェック（Week 4）

- [ ] 統合テスト実行
- [ ] GitHub Pages デプロイ設定
- [ ] ドキュメント完成
- [ ] 本番運用開始

**期待結果**: Web サイト公開 + 毎日自動更新

---

## 🎯 各フェーズの主要ファイル

### Phase 1 (Week 1)

```
msblogs-updates-tracker/
├── scripts/
│   ├── fetch-blogs.js        ← 実装対象
│   └── diff-analyzer.js      ← 実装対象
├── config/
│   └── blog-sources.json     ← 作成対象
├── cache/                    ← 出力ディレクトリ
└── package.json              ← 修正対象
```

### Phase 2 (Week 2)

```
.github/
├── workflows/
│   ├── daily-blog-scan.yml   ← 作成対象
│   └── analyze-blogs.yml     ← 作成対象
├── agents/
│   └── blog-diff-analyzer.md ← 作成対象
└── mcp.json                  ← 作成対象
```

### Phase 3 (Week 3)

```
site/
├── src/
│   ├── pages/
│   │   ├── index.astro       ← 実装対象
│   │   └── updates/
│   │       └── [date].astro  ← 実装対象
│   ├── layouts/
│   │   └── Layout.astro      ← 実装対象
│   ├── content/
│   │   └── config.ts         ← 作成対象
│   └── styles/
│       └── global.css        ← 実装対象
└── package.json
```

### Phase 4 (Week 4)

```
.github/workflows/
├── deploy.yml                ← 作成対象
└── (各フェーズの調整・テスト)
```

---

## 🔧 推奨開発環境

```
OS: Windows / macOS / Linux
Node.js: 18 以上
npm: 9 以上
Git: 2.40 以上

IDE: VS Code + 拡張機能
  - TypeScript Vue Plugin
  - Astro
  - GitHub Actions
  - Prettier
  - ESLint

ローカルテスト:
  - GitHub Actions ローカル実行: https://github.com/nektos/act
```

---

## 💡 開発のコツ

### 1. 段階的テスト

- 各タスク完了後、必ずローカルで動作確認
- Phase ごとに git commit
- 定期的に GitHub に push

### 2. ログ・デバッグ

- 各スクリプトに `console.log` / `logger` 実装
- GitHub Actions ログを定期確認
- エラー時は Issues 作成

### 3. 品質維持

- `npm run lint` & `npm run format` を定期実行
- TypeScript の型チェック厳格化
- テストコード先行開発（可能な範囲で）

### 4. ドキュメント

- 困ったら DETAILED_DESIGN.md を参照
- AGENT_INSTRUCTIONS.md で エージェント動作を確認
- IMPLEMENTATION_PLAN.md で 次のタスクを確認

---

## ⚠️ よくあるトラブル＆対処

| 問題                 | 原因             | 対処                                |
| -------------------- | ---------------- | ----------------------------------- |
| RSS フィード取得 404 | URL が変わった   | `blog-sources.json` を更新          |
| スクレイピング失敗   | HTML 構造変更    | CSS セレクター修正                  |
| キャッシュ競合       | 同時実行         | workflow に `concurrency` 追加      |
| 自動コミット失敗     | トークン権限不足 | GitHub Settings で permissions 確認 |
| Astro build 失敗     | 依存関係崩れ     | `npm install` 再実行                |

**詳細**: DETAILED_DESIGN.md > トラブルシューティング

---

## 📅 推奨スケジュール

```
Week 1 (6/20-6/26):
  Mon: Task 1.1, 1.2 完了
  Tue: Task 1.3, 1.4 完了
  Wed: Task 1.5 完了
  Thu: Task 1.6 完了
  Fri: テスト & レビュー

Week 2 (6/27-7/3):
  Mon-Tue: Task 2.1, 2.2 完了
  Wed: Task 2.3, 2.4 完了
  Thu-Fri: テスト & デバッグ

Week 3 (7/4-7/10):
  Mon-Tue: Task 3.1, 3.2 完了
  Wed: Task 3.3, 3.4 完了
  Thu-Fri: UI 改善 & テスト

Week 4 (7/11-7/18):
  Mon-Tue: Task 4.1 テスト
  Wed: Task 4.2 デプロイ設定
  Thu: Task 4.3 ドキュメント
  Fri: ローンチ準備 & 最終確認
```

---

## 🎉 次のステップ

1. **今すぐ**: ドキュメント確認
   - DETAILED_DESIGN.md をざっと読む
   - AGENT_INSTRUCTIONS.md で エージェント像を把握
   - IMPLEMENTATION_PLAN.md で Task 1.1 確認

2. **本日中**: リポジトリ作成（任意）

- GitHub で `msblogs-updates-tracker` リポジトリ作成
- ローカルに remote 追加

3. **明日**: 開発開始
   - Task 1.1 実行（リポジトリセットアップ）
   - Task 1.2 実行（npm プロジェクト作成）
   - ローカル環境構築完了

4. **今週末**: Phase 1 完了
   - ブログ取得スクリプト実装完了
   - 差分検出実装完了
   - ローカルテスト成功

---

**準備完了！実装を開始してください！** 🚀

何か不明な点があれば、ドキュメントを参照するか、GitHub Issues で質問してください。

Happy coding! 🎉
