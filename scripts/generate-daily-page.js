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
    if (cleanText(article.summary_en)) {
      lines.push(`    summaryEn: ${yamlScalar(cleanText(article.summary_en))}`);
    }
  }
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

function splitSentences(text) {
  const normalized = cleanText(text);
  if (!normalized) {
    return [];
  }
  return normalized
    .split(/(?<=[.!?。！？])\s+/)
    .map((sentence) => cleanText(sentence))
    .filter((sentence) => sentence.length > 20);
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
    $('article p, main p, [role="main"] p, .post-content p, .entry-content p, .article-content p, p')
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
  const sourceSentences = splitSentences(articleText);
  if (sourceSentences.length === 0) {
    return baseSummary || 'Primary article body could not be extracted. Please refer to the original URL.';
  }

  const targetMin = Math.max(baseSummary.length * 2, 180);
  const targetMax = Math.max(baseSummary.length * 3, 420);
  let summary = '';

  for (const sentence of sourceSentences) {
    const next = summary ? `${summary} ${sentence}` : sentence;
    if (next.length > targetMax) {
      break;
    }
    summary = next;
    if (summary.length >= targetMin) {
      break;
    }
  }

  if (!summary) {
    summary = sourceSentences[0];
  }

  if (summary.length > targetMax) {
    summary = `${summary.slice(0, targetMax - 3).trim()}...`;
  }

  return summary;
}

const JAPANESE_TOPIC_RULES = [
  {
    keywords: ['copilot', 'agent', 'model', 'ai', 'llm', 'machine learning'],
    text: 'Copilot や AI、エージェントに関する変更点や評価ポイントを確認できます。',
  },
  {
    keywords: ['security', 'identity', 'compliance', 'vulnerability', 'cve', 'defender'],
    text: 'セキュリティ、ID、コンプライアンスに関する重要な更新を確認できます。',
  },
  {
    keywords: ['azure', 'cloud', 'kubernetes', 'container', 'serverless'],
    text: 'Azure やクラウド基盤に関する新機能・運用上のポイントを確認できます。',
  },
  {
    keywords: ['teams', 'outlook', 'microsoft 365', 'office', 'productivity'],
    text: 'Microsoft 365 と業務生産性に関する機能更新を確認できます。',
  },
  {
    keywords: ['fabric', 'power bi', 'analytics', 'data', 'warehouse', 'lakehouse'],
    text: 'データ分析基盤や Fabric / Power BI に関する更新を確認できます。',
  },
  {
    keywords: ['github', 'vscode', 'visual studio', 'developer', 'extension', 'actions'],
    text: '開発者向けツールやワークフローに関する更新を確認できます。',
  },
];

const JAPANESE_ACTION_RULES = [
  {
    keywords: ['general availability', 'ga', 'available', 'launch', 'released', 'introducing'],
    text: '新機能またはサービス提供開始の内容です。',
  },
  {
    keywords: ['preview', 'beta'],
    text: 'プレビュー機能や今後利用可能になる機能の案内です。',
  },
  {
    keywords: ['deprecated', 'deprecation', 'retire', 'retirement', 'breaking change'],
    text: '廃止予定や互換性に影響する変更に注意が必要です。',
  },
  {
    keywords: ['performance', 'efficiency', 'improve', 'improvement', 'best practices'],
    text: '性能改善やベストプラクティスに関する解説です。',
  },
];

function findJapaneseRuleText(text, rules, fallback) {
  const haystack = cleanText(text).toLowerCase();
  return rules.find((rule) => rule.keywords.some((keyword) => haystack.includes(keyword)))?.text || fallback;
}

function buildJapaneseSummary(article, englishSummary) {
  const title = cleanText(article.title) || '無題の記事';
  const sourceName = cleanText(article.source_name) || cleanText(article.source_id) || 'Microsoft 関連ブログ';
  const haystack = `${title} ${englishSummary} ${article.summary}`;
  const action = findJapaneseRuleText(haystack, JAPANESE_ACTION_RULES, '発表内容や変更点の概要を確認できます。');
  const topic = findJapaneseRuleText(
    haystack,
    JAPANESE_TOPIC_RULES,
    'Microsoft と GitHub の技術情報に関する更新を確認できます。',
  );

  return `${sourceName} で「${title}」が公開されました。${action}${topic}`;
}

async function buildLocalizedArticlesBySource(diff) {
  const articlesBySource = new Map();
  const frontmatterArticles = [];
  const sortedArticles = [...(diff.new_articles || [])].sort((left, right) =>
    cleanText(left.source_name).localeCompare(cleanText(right.source_name)),
  );

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

    const sourceName = cleanText(article.source_name) || cleanText(article.source_id) || 'unknown';
    const summaryEn = buildGroundedSummary(article, articleText);
    const summary = buildJapaneseSummary(article, summaryEn);
    const localizedArticle = {
      ...article,
      summary,
      summary_en: summaryEn,
    };

    frontmatterArticles.push(localizedArticle);

    if (!articlesBySource.has(sourceName)) {
      articlesBySource.set(sourceName, []);
    }

    articlesBySource.get(sourceName).push({
      title: cleanText(article.title),
      url: articleUrl,
      publishedAt: cleanText(article.published_at) || 'unknown',
      summary,
      summaryEn,
    });
  }

  return { articlesBySource, frontmatterArticles };
}

function buildFrontmatter(date, diff) {
  const tags = Array.from(
    new Set((diff.new_articles || []).map((article) => toTag(article.source_id)).filter(Boolean)),
  );

  const lines = ['---'];
  lines.push(`title: ${yamlScalar(`Microsoft 技術ブログ更新 - ${date}`)}`);
  lines.push(`titleEn: ${yamlScalar(`Microsoft Technology Updates - ${date}`)}`);
  lines.push(`date: ${yamlScalar(date)}`);
  lines.push(
    `description: ${yamlScalar(
      `GitHub、VSCode、Azure、Microsoft 365、Fabric、AI ブログの ${date} の日次更新です。`,
    )}`,
  );
  lines.push(
    `descriptionEn: ${yamlScalar(
      `Daily updates from GitHub, VSCode, Azure, Microsoft 365, Fabric, and AI blogs for ${date}.`,
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
  const { articlesBySource, frontmatterArticles } = await buildLocalizedArticlesBySource(diff);
  const localizedDiff = { ...diff, new_articles: frontmatterArticles };
  const lines = [
    buildFrontmatter(date, localizedDiff),
    `# Microsoft 技術ブログ更新 - ${date}`,
    '',
    '## サマリー',
    '',
    `- 日付: ${date}`,
    `- 新規記事: ${diff.new_count || 0}`,
    `- 削除記事: ${diff.removed_count || 0}`,
    `- 比較対象: ${diff.compared_with || 'unknown'}`,
    `- ソース数: ${diff.source_count || 0}`,
    '',
    '## ソース別記事',
    '',
  ];

  if (frontmatterArticles.length === 0) {
    lines.push('新規記事はありません。');
  } else {
    for (const [sourceName, articles] of articlesBySource.entries()) {
      lines.push(`### ${sourceName} (${articles.length})`);
      lines.push('');
      for (const article of articles) {
        lines.push(`#### [${article.title}](${article.url})`);
        lines.push(`- 公開日時: ${article.publishedAt}`);
        lines.push(`- 要約: ${article.summary}`);
        lines.push(`- English summary: ${article.summaryEn}`);
        lines.push('');
      }
    }
  }

  lines.push('');
  return lines.join('\n');
}

async function updateIndex(date, newCount) {
  await fs.mkdir(UPDATES_DIR, { recursive: true });
  const entry = `- [${date}](./${date}.md) - ${newCount} articles`;
  let current = '# Updates Index\n\n## Recent Updates\n\n';
  if (await fileExists(INDEX_FILE)) {
    current = await fs.readFile(INDEX_FILE, 'utf8');
  }
  if (!current.includes(entry)) {
    current += `${entry}\n`;
    await fs.writeFile(INDEX_FILE, current, 'utf8');
  }
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
