'use strict';

/**
 * generate-site.js
 *
 * content/updates/*.md を読み込み、シンプルな HTML 静的サイトを
 * site/ ディレクトリへ出力する。GitHub Pages にそのまま公開できる。
 *
 * 使い方:
 *   node scripts/generate-site.js
 *
 * 出力:
 *   site/index.html          -- 全日付一覧ページ
 *   site/{YYYY-MM-DD}.html   -- 各日付の更新ページ
 */

const fs = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const UPDATES_DIR = path.join(ROOT, 'content', 'updates');
const SITE_DIR = path.join(ROOT, 'site');

const SITE_TITLE = 'MS Blogs Update Tracker';
const SITE_DESCRIPTION = 'Microsoft & GitHub ブログの毎日の更新情報';

/** Markdown の基本要素を HTML に変換する簡易パーサー */
function markdownToHtml(markdown) {
  const lines = markdown.split('\n');
  const html = [];
  let inList = false;

  for (const line of lines) {
    // H1
    if (/^# (.+)/.test(line)) {
      if (inList) {
        html.push('</ul>');
        inList = false;
      }
      html.push(`<h1>${escapeHtml(line.slice(2).trim())}</h1>`);
      continue;
    }
    // H2
    if (/^## (.+)/.test(line)) {
      if (inList) {
        html.push('</ul>');
        inList = false;
      }
      html.push(`<h2>${escapeHtml(line.slice(3).trim())}</h2>`);
      continue;
    }
    // H3
    if (/^### (.+)/.test(line)) {
      if (inList) {
        html.push('</ul>');
        inList = false;
      }
      html.push(`<h3>${escapeHtml(line.slice(4).trim())}</h3>`);
      continue;
    }
    // List items (nested 2 spaces)
    if (/^  - (.+)/.test(line)) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li class="nested">${renderInline(line.slice(4).trim())}</li>`);
      continue;
    }
    // List items
    if (/^- (.+)/.test(line)) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${renderInline(line.slice(2).trim())}</li>`);
      continue;
    }
    // Close list on blank / non-list line
    if (inList && line.trim() === '') {
      html.push('</ul>');
      inList = false;
      html.push('<br>');
      continue;
    }
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
    // Blank line
    if (line.trim() === '') {
      html.push('<br>');
      continue;
    }
    // Normal paragraph
    html.push(`<p>${renderInline(line)}</p>`);
  }

  if (inList) html.push('</ul>');
  return html.join('\n');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** インライン要素（リンク・コード・太字）をレンダリングする */
function renderInline(text) {
  return (
    text
      // [text](url)
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        (_, label, href) =>
          `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`,
      )
      // `code`
      .replace(/`([^`]+)`/g, (_, code) => `<code>${escapeHtml(code)}</code>`)
      // **bold**
      .replace(/\*\*([^*]+)\*\*/g, (_, bold) => `<strong>${escapeHtml(bold)}</strong>`)
      // remaining < > &
      .replace(/&(?!amp;|lt;|gt;|quot;|#)/g, '&amp;')
      .replace(/<(?!a |\/a>|code>|\/code>|strong>|\/strong>)/g, '&lt;')
  );
}

/** HTML ページのシェルを生成する */
function pageShell({ title, description, body, backLink = false }) {
  const back = backLink ? '<p class="back"><a href="./index.html">← 一覧へ戻る</a></p>' : '';
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(description)}">
  <title>${escapeHtml(title)}</title>
  <style>
    *,*::before,*::after { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background: #f6f8fa; color: #24292f; line-height: 1.6; }
    .container { max-width: 860px; margin: 0 auto; padding: 2rem 1rem; }
    header { background: #0d1117; color: #fff; padding: 1.25rem 0; margin-bottom: 2rem; }
    header .container { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    header h1 { margin: 0; font-size: 1.4rem; }
    header p { margin: 0.25rem 0 0; font-size: 0.9rem; opacity: 0.7; }
    h1 { font-size: 1.6rem; border-bottom: 2px solid #e1e4e8; padding-bottom: 0.5rem; margin-bottom: 1.25rem; }
    h2 { font-size: 1.2rem; margin-top: 2rem; color: #0550ae; }
    h3 { font-size: 1rem; margin-top: 1.5rem; color: #57606a; }
    ul { padding-left: 1.5rem; }
    li { margin-bottom: 0.35rem; }
    li.nested { color: #57606a; font-size: 0.9rem; }
    a { color: #0969da; text-decoration: none; }
    a:hover { text-decoration: underline; }
    code { background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 3px; padding: 0.1em 0.3em; font-size: 0.85em; }
    .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; margin-top: 1.5rem; }
    .card { background: #fff; border: 1px solid #d0d7de; border-radius: 8px; padding: 1rem; transition: box-shadow .15s; }
    .card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.1); }
    .card a { font-weight: 600; font-size: 1.05rem; }
    .card .meta { font-size: 0.8rem; color: #57606a; margin-top: 0.5rem; }
    .back { margin-bottom: 1.5rem; }
    footer { text-align: center; font-size: 0.8rem; color: #57606a; margin-top: 3rem; padding: 1rem; border-top: 1px solid #e1e4e8; }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <h1>${escapeHtml(SITE_TITLE)}</h1>
      <p>${escapeHtml(SITE_DESCRIPTION)}</p>
    </div>
  </header>
  <div class="container">
    ${back}
    ${body}
  </div>
  <footer><strong>${escapeHtml(SITE_TITLE)}</strong> が生成 — GitHub Actions と Agentic Workflows で運用</footer>
</body>
</html>`;
}

/** 一覧インデックスページを生成する */
function buildIndexPage(dates) {
  if (dates.length === 0) {
    return pageShell({
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      body: '<h1>更新履歴</h1><p>まだ更新データがありません。</p>',
    });
  }

  const cards = dates
    .slice()
    .sort((a, b) => b.localeCompare(a))
    .map(
      (date) =>
        `<div class="card"><a href="./${date}.html">${escapeHtml(date)}</a><div class="meta">日次更新</div></div>`,
    )
    .join('\n');

  const body = `
    <h1>更新履歴</h1>
    <p>全 ${dates.length} 日分の Microsoft と GitHub ブログ更新情報</p>
    <div class="card-grid">
      ${cards}
    </div>`;

  return pageShell({ title: SITE_TITLE, description: SITE_DESCRIPTION, body });
}

async function main() {
  await fs.mkdir(SITE_DIR, { recursive: true });

  // content/updates/*.md を収集
  let files = [];
  try {
    files = await fs.readdir(UPDATES_DIR);
  } catch {
    console.warn(`[WARN] ${UPDATES_DIR} が見つかりません。空のサイトを生成します。`);
  }

  const mdFiles = files.filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f));
  const dates = [];

  for (const file of mdFiles) {
    const date = file.replace('.md', '');
    const mdPath = path.join(UPDATES_DIR, file);
    const markdown = await fs.readFile(mdPath, 'utf8');
    const body = markdownToHtml(markdown);
    const html = pageShell({
      title: `${date} — ${SITE_TITLE}`,
      description: `${date} の Microsoft と GitHub ブログ更新情報`,
      body,
      backLink: true,
    });
    const outPath = path.join(SITE_DIR, `${date}.html`);
    await fs.writeFile(outPath, html, 'utf8');
    dates.push(date);
    console.log(`Generated: ${outPath}`);
  }

  // インデックスページ
  const indexHtml = buildIndexPage(dates);
  const indexPath = path.join(SITE_DIR, 'index.html');
  await fs.writeFile(indexPath, indexHtml, 'utf8');
  console.log(`Generated index: ${indexPath}`);

  console.log(JSON.stringify({ total_pages: dates.length + 1, site_dir: SITE_DIR }, null, 2));
}

main().catch((error) => {
  console.error(`[ERROR] ${error.message}`);
  process.exitCode = 1;
});
