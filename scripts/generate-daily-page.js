const fs = require('fs/promises');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const { toDateString } = require('./utils/date-utils');
const { diffFile, fileExists, readJson } = require('./utils/cache-manager');

const ROOT = path.resolve(__dirname, '..');
const UPDATES_DIR = path.join(ROOT, 'content', 'updates');
const ASTRO_UPDATES_DIR = path.join(ROOT, 'src', 'content', 'updates');
const INDEX_FILE = path.join(UPDATES_DIR, 'index.md');

function cleanText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toTag(sourceId) {
  return String(sourceId || '')
    .replace(/-blog$/u, '')
    .replace(/^microsoft-/u, '')
    .replace(/-/gu, '')
    .trim();
}

function yamlScalar(value) {
  return JSON.stringify(value ?? '');
}

function pushYamlList(lines, key, values) {
  lines.push(`${key}:`);
  if (!values || values.length === 0) {
    lines.push('  []');
    return;
  }

  for (const value of values) {
    lines.push(`  - ${yamlScalar(value)}`);
  }
}

function pushYamlArticles(lines, articles) {
  lines.push('articles:');
  if (!articles || articles.length === 0) {
    lines.push('  []');
    return;
  }

  for (const article of articles) {
    lines.push('  -');
    lines.push(`    title: ${yamlScalar(cleanText(article.title))}`);
    lines.push(`    url: ${yamlScalar(cleanText(article.url))}`);
    lines.push(`    sourceId: ${yamlScalar(cleanText(article.source_id))}`);
    lines.push(`    sourceName: ${yamlScalar(cleanText(article.source_name))}`);
    lines.push(`    publishedAt: ${yamlScalar(cleanText(article.published_at))}`);
    lines.push(`    summary: ${yamlScalar(cleanText(article.summary))}`);
  }
}

const CHANGE_TYPE_RULES = [
  {
    label: '一般提供開始',
    keywords: [
      'general availability',
      'generally available',
      ' ga ',
      'available today',
      'now available',
    ],
  },
  {
    label: 'プレビュー提供',
    keywords: ['preview', 'early access', 'private preview', 'public preview'],
  },
  {
    label: '新機能・サービスの発表',
    keywords: ['announc', 'launch', 'introduc', 'release', 'new ', 'build smarter', 'add support'],
  },
  {
    label: '機能改善',
    keywords: ['improv', 'enhanc', 'update', 'simplified', 'faster', 'optimized'],
  },
  {
    label: '移行・導入支援',
    keywords: ['migrat', 'modernize', 'guide', 'plan', 'best practice', 'manage', 'govern'],
  },
  {
    label: 'セキュリティ・管理機能',
    keywords: [
      'security',
      'protection',
      'single sign-on',
      'sso',
      'entra',
      'identity',
      'compliance',
      'policy',
    ],
  },
  {
    label: '廃止・移行期限',
    keywords: ['deprecat', 'retire', 'retirement', 'end of support'],
  },
  {
    label: 'コスト・性能最適化',
    keywords: ['cost', 'performance', 'latency', 'throughput', '50%', 'quality'],
  },
];

const TOPIC_RULES = [
  { label: 'Azure', keywords: ['azure'] },
  { label: 'Azure Storage', keywords: ['azure storage', 'storage migration'] },
  { label: 'Microsoft Foundry', keywords: ['foundry'] },
  { label: 'GitHub Copilot', keywords: ['github copilot', 'copilot'] },
  { label: 'GitHub Actions', keywords: ['github actions', 'actions'] },
  { label: 'Visual Studio Code', keywords: ['visual studio code', 'vs code', 'vscode'] },
  { label: 'Microsoft Fabric', keywords: ['fabric'] },
  { label: 'Power BI', keywords: ['power bi'] },
  { label: 'Microsoft 365', keywords: ['microsoft 365', 'm365', 'teams', 'outlook'] },
  { label: 'AI エージェント', keywords: ['agent', 'agentic', 'autonomous'] },
  {
    label: 'データ分析',
    keywords: ['data', 'analytics', 'semantic model', 'warehouse', 'lakehouse'],
  },
  {
    label: '認証・アクセス制御',
    keywords: ['entra', 'single sign-on', 'sso', 'access', 'identity'],
  },
];

function pickRuleLabels(text, rules, fallback, limit = 3) {
  const haystack = ` ${cleanText(text).toLowerCase()} `;
  const labels = [];
  for (const rule of rules) {
    if (rule.keywords.some((keyword) => haystack.includes(keyword))) {
      labels.push(rule.label);
    }
    if (labels.length >= limit) {
      break;
    }
  }
  return labels.length > 0 ? labels : [fallback];
}

function pushYamlSourceBreakdown(lines, diff) {
  lines.push('sourceBreakdown:');
  const entries = Object.entries(diff.by_source || {})
    .map(([sourceId, summary]) => ({
      sourceId,
      sourceName:
        cleanText(summary?.source_name) ||
        diff.new_articles?.find((article) => article.source_id === sourceId)?.source_name ||
        sourceId,
      newCount: summary?.new_count || 0,
    }))
    .filter((entry) => entry.newCount > 0);

  if (entries.length === 0) {
    lines.push('  []');
    return;
  }

  for (const entry of entries) {
    lines.push('  -');
    lines.push(`    sourceId: ${yamlScalar(entry.sourceId)}`);
    lines.push(`    sourceName: ${yamlScalar(entry.sourceName)}`);
    lines.push(`    newCount: ${entry.newCount}`);
  }
}

function uniqueParagraphs(texts) {
  const seen = new Set();
  const unique = [];
  for (const text of texts) {
    const normalized = cleanText(text);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    unique.push(normalized);
  }
  return unique;
}

async function fetchArticleText(url) {
  if (!url) {
    return '';
  }
  const response = await axios.get(url, {
    timeout: 20000,
    headers: { 'User-Agent': 'msblogs-updates-tracker/1.0' },
  });
  const $ = cheerio.load(response.data);

  $('script, style, noscript, header, footer, nav, form, svg, iframe').remove();
  const paragraphCandidates = uniqueParagraphs(
    $(
      'article p, main p, [role="main"] p, .post-content p, .entry-content p, .article-content p, p',
    )
      .toArray()
      .map((node) => $(node).text())
      .filter((text) => cleanText(text).length > 40),
  );

  if (paragraphCandidates.length === 0) {
    return '';
  }

  return paragraphCandidates.join(' ');
}

function buildGroundedSummary(article, articleText) {
  const baseSummary = cleanText(article.summary);
  const evidence = [article.title, article.source_name, baseSummary, articleText]
    .map(cleanText)
    .join(' ');
  const changeTypes = pickRuleLabels(evidence, CHANGE_TYPE_RULES, '記事内容の紹介・解説');
  const topics = pickRuleLabels(
    evidence,
    TOPIC_RULES,
    cleanText(article.source_name) || 'Microsoft 関連技術',
    4,
  );
  const title = cleanText(article.title) || 'タイトル未取得の記事';
  const sourceName = cleanText(article.source_name) || '対象ブログ';
  const sourceHint = articleText ? '記事本文' : baseSummary ? 'RSS 概要' : 'タイトル';

  return [
    `${sourceName} の「${title}」は、${changeTypes.join('、')}に関する更新です。`,
    `対象領域: ${topics.join('、')}。`,
    `${sourceHint}から、提供状況・機能変更・運用への影響を一覧で確認しやすい粒度に要約しています。`,
  ].join(' ');
}

function buildFrontmatter(date, diff) {
  const tags = Array.from(
    new Set((diff.new_articles || []).map((article) => toTag(article.source_id)).filter(Boolean)),
  );

  const lines = ['---'];
  lines.push(`title: ${yamlScalar(`Microsoft 技術ブログ更新 - ${date}`)}`);
  lines.push(`date: ${yamlScalar(date)}`);
  lines.push(
    `description: ${yamlScalar(
      `${date} の GitHub、VS Code、Azure、Microsoft 365、Fabric、AI 関連ブログの日次更新です。`,
    )}`,
  );
  pushYamlList(lines, 'tags', tags);
  lines.push('draft: false');
  lines.push(`lastUpdated: ${yamlScalar(new Date().toISOString())}`);
  lines.push(`newCount: ${diff.new_count || 0}`);
  lines.push(`removedCount: ${diff.removed_count || 0}`);
  lines.push(`sourceCount: ${diff.source_count || 0}`);
  lines.push(`comparedWith: ${yamlScalar(diff.compared_with || '')}`);
  pushYamlArticles(lines, diff.new_articles || []);
  pushYamlSourceBreakdown(lines, diff);
  lines.push('---', '');
  return lines.join('\n');
}

async function toMarkdown(date, diff) {
  const articlesBySource = new Map();
  const enrichedArticles = [];
  const sortedArticles = [...(diff.new_articles || [])].sort((left, right) =>
    cleanText(left.source_name).localeCompare(cleanText(right.source_name)),
  );

  if (sortedArticles.length > 0) {
    const textCache = new Map();
    for (const article of sortedArticles) {
      const articleUrl = cleanText(article.url);
      let articleText = textCache.get(articleUrl) || '';
      if (!articleText && articleUrl) {
        try {
          articleText = await fetchArticleText(articleUrl);
          textCache.set(articleUrl, articleText);
        } catch {
          articleText = '';
        }
      }

      const sourceName = cleanText(article.source_name) || cleanText(article.source_id) || '不明';
      if (!articlesBySource.has(sourceName)) {
        articlesBySource.set(sourceName, []);
      }

      const enrichedArticle = {
        ...article,
        summary: buildGroundedSummary(article, articleText),
      };
      enrichedArticles.push(enrichedArticle);
      articlesBySource.get(sourceName).push({
        title: cleanText(article.title),
        url: cleanText(article.url),
        publishedAt: cleanText(article.published_at) || '不明',
        summary: enrichedArticle.summary,
      });
    }
  }

  const renderedDiff = { ...diff, new_articles: enrichedArticles };
  const lines = [
    buildFrontmatter(date, renderedDiff),
    `# Microsoft 技術ブログ更新 - ${date}`,
    '',
    '## 概要',
    '',
    `- 対象日: ${date}`,
    `- 新規記事: ${diff.new_count || 0} 件`,
    `- 削除記事: ${diff.removed_count || 0} 件`,
    `- 比較対象日: ${diff.compared_with || '不明'}`,
    `- 対象ソース数: ${diff.source_count || 0}`,
    '',
    '## ソース別の新規記事',
    '',
  ];

  if (sortedArticles.length === 0) {
    lines.push('新規記事はありません。');
  } else {
    for (const [sourceName, articles] of articlesBySource.entries()) {
      lines.push(`### ${sourceName} (${articles.length})`);
      lines.push('');
      for (const article of articles) {
        lines.push(`#### [${article.title}](${article.url})`);
        lines.push(`- 公開日時: ${article.publishedAt}`);
        lines.push(`- 変更・発表の要約: ${article.summary}`);
        lines.push('');
      }
    }
  }

  lines.push('');
  return lines.join('\n');
}

async function updateIndex(date, newCount) {
  await fs.mkdir(UPDATES_DIR, { recursive: true });
  const entry = `- [${date}](./${date}.md) - 新規記事 ${newCount} 件`;
  let current = '# 更新インデックス\n\n## 最近の更新\n\n';
  if (await fileExists(INDEX_FILE)) {
    current = await fs.readFile(INDEX_FILE, 'utf8');
  }
  const normalizedLines = current
    .replace(/^# Updates Index/mu, '# 更新インデックス')
    .replace(/^## Recent Updates/mu, '## 最近の更新')
    .split('\n')
    .filter((line) => !line.startsWith(`- [${date}](./${date}.md)`));

  normalizedLines.push(entry);
  await fs.writeFile(INDEX_FILE, `${normalizedLines.join('\n').trim()}\n`, 'utf8');
}

async function writeUpdateFiles(date, markdown) {
  await fs.mkdir(UPDATES_DIR, { recursive: true });
  await fs.mkdir(ASTRO_UPDATES_DIR, { recursive: true });

  const rootOutput = path.join(UPDATES_DIR, `${date}.md`);
  const astroOutput = path.join(ASTRO_UPDATES_DIR, `${date}.md`);

  await fs.writeFile(rootOutput, markdown, 'utf8');
  await fs.writeFile(astroOutput, markdown, 'utf8');

  return rootOutput;
}

async function main() {
  const date = process.argv[2] || toDateString();
  const diffPath = diffFile(date);
  if (!(await fileExists(diffPath))) {
    throw new Error(`Diff file not found: ${diffPath}`);
  }

  const diff = await readJson(diffPath);
  const markdown = await toMarkdown(date, diff);
  const output = await writeUpdateFiles(date, markdown);
  await updateIndex(date, diff.new_count || 0);
  console.log(JSON.stringify({ date, output_file: output }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
