# MS Blogs Update Tracker

Microsoft と GitHub の主要ブログから毎日のアップデート情報を自動収集し、日付ごとに整理されたページを生成するプロジェクトです。

このリポジトリは、GitHub Actions を用いた実運用向けの更新追跡システムです。

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

# Markdown 更新ページ生成（下記の Copilot 認証設定が必要）
npm run generate

# Astro サイト起動（ローカル開発）
npm run dev

# テスト実行
npm test
```

### 本文に基づく日本語要約

日次生成では記事の本文、見出し、箇条書き、表を取得し、GitHub Copilot CLI で「何が変わったか」「重要ポイント」「なぜ重要か」を日本語と英語にまとめます。英語 UI では要約・重要ポイント・重要性の説明を英語で表示します。記事タイトルや RSS の抜粋にキーワード固定文を足す処理は使用しません。

**初回設定が必要です。** Copilot CLI を利用できるアカウントで、アカウント権限 **Copilot Requests** を付与した fine-grained PAT を作成してください。組織の Copilot・モデル利用ポリシーも適用されます。通常の Actions `GITHUB_TOKEN` や classic PAT は代用しません。

1. GitHub の Settings → Secrets and variables → Actions に、Repository secret `COPILOT_GITHUB_TOKEN` を登録します。トークンをソースコードやチャットに貼り付けないでください。
2. モデルの既定値は `gpt-5.4` です。別の利用可能なモデルを指定する場合は Repository variable `SUMMARY_MODEL` を設定します。
3. ローカル生成でも同名の環境変数 `COPILOT_GITHUB_TOKEN` を安全な方法で設定します。要約用 CLI は一時ディレクトリで実行するため、通常の `copilot login` の保存済み認証は参照しません。
4. `analyze-blogs.yml` を再利用ワークフローとして呼ぶ場合は、同名の secret を明示的に渡すか `secrets: inherit` を使用します。

記事ごとにモデルを呼ぶため、契約に応じた利用枠・課金が発生します。検証済み要約は本文・URL・モデルごとに `cache/summaries/` へ保存され、同じ条件の再実行では再利用されます。期間生成が途中で失敗した場合も保存済み要約から再開します。CLI はバージョン固定で npm に含まれ、ツールを無効にし、MCP・カスタム指示・ユーザー設定を読み込まない独立した環境で、標準入力から本文を受け取ります。取得した公開本文は Copilot のモデルサービスへ送信されます。記事サイトが HTTP 403 を返した場合、直接取得がタイムアウトした場合、または動的ページの直接抽出結果が本文上限を超えた場合は、公開 URL を Jina Reader (`r.jina.ai`) へ渡して整理済み本文を取得します。

CLI の表示用テキストは Markdown の整形が入るため、要約の JSON として直接解析しません。`--output-format=json` の JSONL イベントから正常終了と最終回答を確認し、回答内の JSON と本文中の根拠引用を検証します。思考過程、途中の応答、利用統計は要約に含めません。

JSON の形式や根拠引用の検証に失敗した場合は、同じ本文と検証エラーを渡して、初回を含め最大3回まで生成します。再試行も利用枠を消費します。本文取得失敗、認証・モデル実行エラー、CLI 出力の破損、再試行後も不正な要約がある場合は、**日次 Markdown の書き込み前に停止**します。既存ページを定型文で上書きしません。本文は10万文字を上限とし、超過時も末尾を黙って切り捨てず停止します。モデル実行は1回最大180秒です。新規記事が0件の日はモデルを呼びません。

根拠引用は出力内容を検証するためだけに使用し、公開ページには載せません。引用の存在チェックは、要約の全主張が正しいことを保証する意味検証ではありません。初回公開時やモデル変更時には原文と要約の提供状況・数値・制限を確認してください。画像や動画だけに含まれる情報は現在のテキスト抽出の対象外です。

既存の定型要約や英訳のない項目は自動では置き換わりません。英語 UI では未翻訳の重要ポイント・重要性の説明を表示せず、英語要約もない場合は未提供の旨を英語で表示します。再生成時には英訳のない古いキャッシュを再利用せず、全項目の日英要約を生成します。例えば9月9日分は、認証設定後に保存済み差分から次のように再生成できます（過去日の再生成で `fetch` / `diff` をやり直す必要はありません）。

```bash
npm run generate -- 2026-09-09
npm run build
```

連続した期間をまとめて再生成する場合も、同じ保存済み差分を使って次のように実行できます。

```bash
npm run generate -- 2026-06-21 2026-09-08
npm run build
```

`content/updates/` と `src/content/updates/` の同日ファイルが同時に更新されます。生成した日本語を確認してから通常の公開手順で反映してください。最新の原文を取得するため、過去の公開時点と本文が異なる場合があります。

参考: [CLI のプログラム実行と認証](https://docs.github.com/en/copilot/how-tos/copilot-cli/automate-copilot-cli/run-cli-programmatically)

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

| Phase                | 内容                               | 状態    |
| -------------------- | ---------------------------------- | ------- |
| **Phase 1** (Week 1) | ブログ取得・差分検出スクリプト実装 | ✅ 完了 |
| **Phase 2** (Week 2) | GitHub Actions ワークフロー整備    | ✅ 完了 |
| **Phase 3** (Week 3) | 静的サイト生成スクリプト実装       | ✅ 完了 |
| **Phase 4** (Week 4) | テスト・デプロイ・運用化           | ✅ 完了 |

## 🔁 GitHub Actions ワークフロー

| ワークフロー          | トリガー                              | 概要                                                                     |
| --------------------- | ------------------------------------- | ------------------------------------------------------------------------ |
| `daily-blog-scan.yml` | 毎日 23:00 UTC（日本時間 8:00）/ 手動 | ブログ取得→差分検出→ページ生成→`main` へ自動コミット→GitHub Pages へ公開 |
| `analyze-blogs.yml`   | 手動 / `workflow_call`                | ブログ取得・解析のみ                                                     |
| `publish-updates.yml` | `main` ブランチ push / 手動           | Astro をビルドして GitHub Pages へ公開                                   |

## 🧪 テスト

```bash
npm test
# → 全テストパス（Node.js 組み込みテストランナー使用）
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
4. 日次運用は `daily-blog-scan.yml` が日本時間 8:00 に更新を確認し、変更がある場合は `main` へ自動コミットして GitHub Pages へ公開するため、PR の手動マージは不要
5. `daily-blog-scan.yml` の自動コミットには、Actions の **Workflow permissions** で Read and write permissions を有効にし、必要に応じて `github-actions[bot]` が `main` へ push できるようにブランチ保護を調整。
6. 公開 URL は `https://tokawa-ms.github.io/msblogs-updates-tracker/`

日次生成に失敗してコードを修正した場合は、修正を `main` に反映してから **Daily Blog Scan → Run workflow** を新しく開始してください。`target_date` を空欄にすると日本時間の当日分を取得・要約し、コミット、ビルド、Pages 公開まで進みます。失敗日の処理をやり直す場合はその日付を指定しますが、取得対象は実行時点のフィードです。古い実行の **Re-run jobs** は元のワークフロー定義と入力を再利用するため、最新の定義と意図した日付を確認するには新しい実行を使用します。定期実行は引き続き毎日23:00 UTC（日本時間8:00）で、Actions の混雑によって開始が遅れる場合があります。

## 🛠️ 技術スタック

- Node.js 24
- TypeScript
- Astro
- GitHub Actions（標準 Workflow）
- cheerio（HTML パース）
- rss-parser（RSS パース）
- Node.js 組み込みテストランナー（`node:test`）

## 📖 詳細ドキュメント

実装詳細は `docs/` ディレクトリのドキュメントを参照してください。

---

**プロジェクト名**: MS Blogs Update Tracker  
**開始日**: 2026-06-20  
**状態**: ✅ Production Ready (Phase 4 完了)
