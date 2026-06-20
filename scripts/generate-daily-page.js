const fs = require('fs/promises');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const { toDateString } = require('./utils/date-utils');
const { diffFile, fileExists, readJson } = require('./utils/cache-manager');

const ROOT = path.resolve(__dirname, '..');
const UPDATES_DIR = path.join(ROOT, 'content', 'updates');
const INDEX_FILE = path.join(UPDATES_DIR, 'index.md');

function cleanText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
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

async function toMarkdown(date, diff) {
  const lines = [
    `# Daily Updates - ${date}`,
    '',
    `- Date: ${date}`,
    `- New articles: ${diff.new_count || 0}`,
    `- Removed articles: ${diff.removed_count || 0}`,
    '',
    '## New Articles',
    '',
  ];

  if (!diff.new_articles || diff.new_articles.length === 0) {
    lines.push('No new articles.');
  } else {
    const textCache = new Map();
    for (const article of diff.new_articles) {
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

      lines.push(`- [${article.title}](${article.url})`);
      lines.push(`  - Source: ${article.source_name || article.source_id || 'unknown'}`);
      lines.push(`  - Published: ${article.published_at || 'unknown'}`);
      lines.push(`  - Summary: ${buildGroundedSummary(article, articleText)}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

async function updateIndex(date) {
  await fs.mkdir(UPDATES_DIR, { recursive: true });
  const entry = `- [${date}](./${date}.md)`;
  let current = '# Updates Index\n\n';
  if (await fileExists(INDEX_FILE)) {
    current = await fs.readFile(INDEX_FILE, 'utf8');
  }
  if (!current.includes(entry)) {
    current += `${entry}\n`;
    await fs.writeFile(INDEX_FILE, current, 'utf8');
  }
}

async function main() {
  const date = process.argv[2] || toDateString();
  const diffPath = diffFile(date);
  if (!(await fileExists(diffPath))) {
    throw new Error(`Diff file not found: ${diffPath}`);
  }

  const diff = await readJson(diffPath);
  const markdown = await toMarkdown(date, diff);
  await fs.mkdir(UPDATES_DIR, { recursive: true });
  const output = path.join(UPDATES_DIR, `${date}.md`);
  await fs.writeFile(output, markdown, 'utf8');
  await updateIndex(date);
  console.log(JSON.stringify({ date, output_file: output }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
