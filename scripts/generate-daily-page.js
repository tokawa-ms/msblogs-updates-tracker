const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const cheerio = require('cheerio');
const { isDateString, toDateString } = require('./utils/date-utils');
const { diffFile, fileExists, readJson, writeJson } = require('./utils/cache-manager');
const { MAX_ARTICLE_LENGTH, summarizeArticle } = require('./utils/article-summarizer');

const ROOT = path.resolve(__dirname, '..');
const UPDATES_DIR = path.join(ROOT, 'content', 'updates');
const ASTRO_UPDATES_DIR = path.join(ROOT, 'src', 'content', 'updates');
const INDEX_FILE = path.join(UPDATES_DIR, 'index.md');
const SUMMARY_CACHE_DIR = path.join(ROOT, 'cache', 'summaries');
const SUMMARY_CACHE_SCHEMA = 1;

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
    lines.push(`    keyPoints: ${JSON.stringify(article.key_points || [])}`);
    lines.push(`    significance: ${yamlScalar(cleanText(article.significance))}`);
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

function findArticleBody(value) {
  if (!value || typeof value !== 'object') return '';
  if (typeof value.articleBody === 'string') return value.articleBody;
  const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
  if (types.includes('BlogPosting') && typeof value.description === 'string' && value.description.length >= 500) {
    return value.description;
  }
  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    const articleBody = findArticleBody(child);
    if (articleBody) return articleBody;
  }
  return '';
}

function extractStructuredArticleText($) {
  for (const element of $('script[type="application/ld+json"]').toArray()) {
    try {
      const articleBody = findArticleBody(JSON.parse($(element).html() || ''));
      if (!articleBody) continue;
      const decoded = cheerio.load(articleBody).text();
      const text = uniqueParagraphs(decoded.split(/\r?\n/gu)).join('\n\n');
      if (text.length >= 100) return text;
    } catch {
      // Ignore invalid metadata and continue with the visible article containers.
    }
  }
  return '';
}

function extractArticleText(html) {
  const $ = cheerio.load(html);
  const structuredText = extractStructuredArticleText($);
  if (structuredText) return structuredText;

  $('script, style, noscript, nav, footer, aside, form, svg, iframe, [hidden], [aria-hidden="true"], .related-posts, .sharedaddy, #comments').remove();
  const selectors = ['[itemprop="articleBody"]', '.entry-content', '.post-content', '.article-content', '.blog-post-content', 'article', 'main', '[role="main"]'];
  for (const selector of selectors) {
    const root = $(selector).first();
    const blocks = uniqueParagraphs(root.find('h1, h2, h3, h4, p, li, tr, figcaption, pre')
      .toArray()
      .filter((node) => $(node).parentsUntil(root).filter('li, tr, pre').length === 0)
      .map((node) => $(node).is('tr')
        ? $(node).find('th, td').toArray().map((cell) => cleanText($(cell).text())).join(' | ')
        : $(node).text()));
    const text = blocks.join('\n\n');
    if (text.length >= 100) return text;
  }
  throw new Error('Article body could not be extracted from an article/main container.');
}

function extractReaderArticleText(value) {
  const text = String(value || '');
  const marker = 'Markdown Content:';
  const articleText = (text.includes(marker) ? text.slice(text.indexOf(marker) + marker.length) : text).trim();
  if (articleText.length < 100) throw new Error('Article body returned by the reader is missing or too short.');
  return articleText;
}

function readerUrls(url) {
  const urls = [`https://r.jina.ai/${url}`];
  const match = url.match(/^https:\/\/community\.fabric\.microsoft\.com\/t5\/[^/]+\/.*\/ba-p\/(\d+)$/u);
  if (match) urls.push(`https://r.jina.ai/https://community.fabric.microsoft.com/blog/fbc_pbiupdatesblog/article/${match[1]}`);
  return urls;
}

function readerRetryDelay(error, attempt) {
  const retryAfter = Number(error.response?.headers?.['retry-after']);
  if (Number.isFinite(retryAfter) && retryAfter >= 0) return Math.min(retryAfter * 1000, 30000);
  return 1000 * (2 ** (attempt - 1));
}

async function fetchArticleText(url, get = axios.get, wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds))) {
  try {
    const response = await get(url, {
      timeout: 20000,
      maxContentLength: 5 * 1024 * 1024,
      headers: { 'User-Agent': 'msblogs-updates-tracker/1.0' },
    });
    const articleText = extractArticleText(response.data);
    if (articleText.length <= MAX_ARTICLE_LENGTH) return articleText;
  } catch (error) {
    if (error.response?.status !== 403) throw error;
  }

  let readerError;
  for (const readerUrl of readerUrls(url)) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await get(readerUrl, {
          timeout: 60000,
          maxContentLength: 5 * 1024 * 1024,
          headers: { Accept: 'text/plain', 'User-Agent': 'msblogs-updates-tracker/1.0' },
        });
        return extractReaderArticleText(response.data);
      } catch (error) {
        readerError = error;
        if (error.response?.status !== 429 || attempt === 3) break;
        await wait(readerRetryDelay(error, attempt));
      }
    }
  }
  throw readerError;
}

function isCompleteSummary(value) {
  return typeof value?.summary === 'string' && typeof value?.summaryEn === 'string' &&
    Array.isArray(value?.keyPoints) && value.keyPoints.length >= 2 &&
    value.keyPoints.every((point) => typeof point === 'string') && typeof value?.significance === 'string';
}

async function summarizeArticleCached(article, body, summarize = summarizeArticle, cacheDir = SUMMARY_CACHE_DIR) {
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify({
    schema: SUMMARY_CACHE_SCHEMA,
    model: process.env.SUMMARY_MODEL || 'gpt-5.4',
    url: cleanText(article.url),
    body,
  })).digest('hex');
  const cacheFile = path.join(cacheDir, `${fingerprint}.json`);

  if (await fileExists(cacheFile)) {
    try {
      const cached = await readJson(cacheFile);
      if (isCompleteSummary(cached)) return cached;
    } catch {
      // Replace incomplete or corrupt cache entries with a newly validated summary.
    }
  }

  const analysis = await summarize(article, body);
  if (!isCompleteSummary(analysis)) throw new Error('Summarizer returned an incomplete validated summary.');
  await writeJson(cacheFile, analysis);
  return analysis;
}

async function buildLocalizedArticlesBySource(diff, { fetchText = fetchArticleText, summarize = summarizeArticle } = {}) {
  const articlesBySource = new Map();
  const frontmatterArticles = [];
  const sortedArticles = [...(diff.new_articles || [])].sort((left, right) =>
    cleanText(left.source_name).localeCompare(cleanText(right.source_name)),
  );

  const summaryCache = new Map();
  for (const article of sortedArticles) {
    const articleUrl = cleanText(article.url);
    let analysis = summaryCache.get(articleUrl);
    if (!analysis) {
      try {
        const body = await fetchText(articleUrl);
        analysis = summarize === summarizeArticle
          ? await summarizeArticleCached(article, body)
          : await summarize(article, body);
        summaryCache.set(articleUrl, analysis);
      } catch (error) {
        throw new Error(`Cannot generate grounded summary for ${articleUrl}: ${error.message}`);
      }
    }

    const sourceName = cleanText(article.source_name) || cleanText(article.source_id) || 'unknown';
    const { summary, summaryEn, keyPoints, significance } = analysis;
    const localizedArticle = {
      ...article,
      summary,
      summary_en: summaryEn,
      key_points: keyPoints,
      significance,
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
      keyPoints,
      significance,
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

function markdownText(value) {
  return cleanText(value).replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;')
    .replace(/([\\`*_[\]{}])/gu, '\\$1');
}

async function toMarkdown(date, diff, options) {
  const { articlesBySource, frontmatterArticles } = await buildLocalizedArticlesBySource(diff, options);
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
        lines.push(`- 要約: ${markdownText(article.summary)}`);
        lines.push(`- なぜ重要か: ${markdownText(article.significance)}`);
        lines.push('');
        lines.push('**重要ポイント**');
        for (const point of article.keyPoints) lines.push(`- ${markdownText(point)}`);
        lines.push('');
        lines.push('<details><summary>English summary</summary>', '');
        lines.push(markdownText(article.summaryEn));
        lines.push('', '</details>');
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

function enumerateDates(startDate, endDate) {
  const dates = [];
  const cursor = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  while (cursor <= end) {
    dates.push(toDateString(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function resolveTargetDates(args, fallbackDate = toDateString()) {
  const [startArg, endArg] = args;

  if (!startArg) {
    return [fallbackDate];
  }

  if (!isDateString(startArg)) {
    throw new Error(`Invalid date: ${startArg}`);
  }

  if (!endArg) {
    return [startArg];
  }

  if (!isDateString(endArg)) {
    throw new Error(`Invalid date: ${endArg}`);
  }

  if (startArg > endArg) {
    throw new Error(`Start date must be on or before end date: ${startArg} > ${endArg}`);
  }

  return enumerateDates(startArg, endArg);
}

async function generateDate(date, options) {
  const diffPath = diffFile(date);
  if (!(await fileExists(diffPath))) {
    throw new Error(`Diff file not found: ${diffPath}`);
  }

  const diff = await readJson(diffPath);
  const markdown = await toMarkdown(date, diff, options);
  const output = await writeUpdateFiles(date, markdown);
  await updateIndex(date, diff.new_count || 0);

  return { date, output_file: output, new_count: diff.new_count || 0 };
}

async function main() {
  const dates = resolveTargetDates(process.argv.slice(2));
  const results = [];

  for (const date of dates) {
    results.push(await generateDate(date));
  }

  console.log(JSON.stringify({
    generated: results.length,
    dates: results.map((result) => result.date),
    outputs: results,
  }, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  cleanText,
  enumerateDates,
  extractArticleText,
  extractReaderArticleText,
  fetchArticleText,
  generateDate,
  resolveTargetDates,
  summarizeArticleCached,
  toMarkdown,
};
