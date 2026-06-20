const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const axios = require('axios');
const cheerio = require('cheerio');
const RssParser = require('rss-parser');

const logger = require('./utils/logger');
const { isDateString, parseToIsoString, toDateString } = require('./utils/date-utils');
const {
  ensureCacheDirs,
  sourceCacheFile,
  combinedCacheFile,
  writeJson,
  updateManifest,
} = require('./utils/cache-manager');

const SOURCE_CONFIG = path.resolve(__dirname, '..', 'config', 'blog-sources.json');

function hashUrl(url) {
  return crypto.createHash('sha256').update(url).digest('hex').slice(0, 16);
}

function normalizeArticle(raw, source) {
  const normalizedUrl = raw.url ? raw.url.trim() : '';
  return {
    id: hashUrl(normalizedUrl || `${source.id}-${raw.title || 'unknown'}`),
    source_id: source.id,
    source_name: source.name,
    title: (raw.title || '').trim(),
    url: normalizedUrl,
    published_at: parseToIsoString(raw.date) || new Date().toISOString(),
    summary: (raw.summary || '').trim(),
    fetched_at: new Date().toISOString(),
  };
}

class BaseFetcher {
  constructor(source) {
    this.source = source;
  }

  async fetch() {
    throw new Error(`fetch() is not implemented for ${this.source.id}`);
  }

  async saveCache(date, articles) {
    const file = sourceCacheFile(this.source.id, date);
    await writeJson(file, articles);
    return file;
  }
}

class RssFetcher extends BaseFetcher {
  constructor(source) {
    super(source);
    this.parser = new RssParser();
  }

  async fetch() {
    const feedUrl = this.source.feedUrl || this.source.url;
    const response = await axios.get(feedUrl, {
      responseType: 'text',
      timeout: 20000,
      headers: { 'User-Agent': 'msblogs-updates-tracker/1.0' },
    });
    const parsed = await this.parser.parseString(response.data);
    const items = (parsed.items || []).map((item) => ({
      title: item.title,
      url: item.link,
      date: item.isoDate || item.pubDate || item.published || item.dcDate,
      summary: item.contentSnippet || item.content || item.summary || item.description || '',
    }));
    return items.slice(0, this.source.limit || 30);
  }
}

class HtmlScraper extends BaseFetcher {
  toAbsoluteUrl(url) {
    if (!url) {
      return '';
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return new URL(url, this.source.url).toString();
  }

  async fetch() {
    const response = await axios.get(this.source.url, {
      timeout: 20000,
      headers: { 'User-Agent': 'msblogs-updates-tracker/1.0' },
    });
    const $ = cheerio.load(response.data);
    const selectors = this.source.selectors || {};
    const articleSelector = selectors.article || 'article';
    const titleSelector = selectors.title || 'h2 a, h3 a, a';
    const urlSelector = selectors.url || titleSelector;
    const dateSelector = selectors.date || 'time';
    const summarySelector = selectors.summary || 'p';
    const items = [];

    $(articleSelector).each((_, element) => {
      const titleNode = $(element).find(titleSelector).first();
      const urlNode = $(element).find(urlSelector).first();
      const dateNode = $(element).find(dateSelector).first();
      const summaryNode = $(element).find(summarySelector).first();

      const title = titleNode.text().trim();
      const href = urlNode.attr('href');
      const date = dateNode.attr('datetime') || dateNode.text().trim();
      const summary = summaryNode.text().trim();

      if (!title || !href) {
        return;
      }

      items.push({
        title,
        url: this.toAbsoluteUrl(href),
        date,
        summary,
      });
    });

    return items.slice(0, this.source.limit || 30);
  }
}

function createFetcher(source) {
  if (source.type === 'rss') {
    return new RssFetcher(source);
  }
  if (source.type === 'html') {
    return new HtmlScraper(source);
  }
  throw new Error(`Unsupported source type: ${source.type}`);
}

function applySourceFilters(articles, source) {
  const filters = Array.isArray(source.filterUrlIncludes)
    ? source.filterUrlIncludes.filter(Boolean)
    : [];
  if (filters.length === 0) {
    return articles;
  }
  return articles.filter((article) =>
    filters.some((fragment) => (article.url || '').toLowerCase().includes(fragment.toLowerCase())),
  );
}

function dedupeByUrl(articles) {
  const seen = new Set();
  return articles.filter((article) => {
    if (!article.url || seen.has(article.url)) {
      return false;
    }
    seen.add(article.url);
    return true;
  });
}

async function main() {
  await ensureCacheDirs();
  const cliTargetDate = process.argv[2];
  const envTargetDate = process.env.TARGET_DATE;
  let today = toDateString();
  if (cliTargetDate != null && cliTargetDate !== '') {
    today = cliTargetDate;
  } else if (envTargetDate != null && envTargetDate !== '') {
    today = envTargetDate;
  }

  if (!isDateString(today)) {
    throw new Error(`Invalid target date: ${today}. Expected YYYY-MM-DD.`);
  }

  const configText = await fs.readFile(SOURCE_CONFIG, 'utf8');
  const sources = JSON.parse(configText);

  const allArticles = [];
  const sourceSummaries = [];
  let sourceFailures = 0;

  for (const source of sources) {
    logger.info(`Fetching source: ${source.name} (${source.type})`);
    try {
      const fetcher = createFetcher(source);
      const rawArticles = await fetcher.fetch();
      const filtered = applySourceFilters(rawArticles, source);
      const normalized = dedupeByUrl(filtered.map((article) => normalizeArticle(article, source)));
      const cacheFile = await fetcher.saveCache(today, normalized);
      sourceSummaries.push({
        source_id: source.id,
        source_name: source.name,
        fetched_count: normalized.length,
        cache_file: cacheFile,
      });
      allArticles.push(...normalized);
      logger.info(`Fetched ${normalized.length} articles from ${source.name}`);
    } catch (error) {
      sourceFailures += 1;
      logger.error(`Failed to fetch ${source.name}: ${error.message}`);
    }
  }

  const allFile = combinedCacheFile(today);
  const uniqueAll = dedupeByUrl(allArticles);
  await writeJson(allFile, uniqueAll);
  await updateManifest({
    last_run: new Date().toISOString(),
    date: today,
    total_sources: sources.length,
    failed_sources: sourceFailures,
    total_articles: uniqueAll.length,
    sources: sourceSummaries,
    combined_file: allFile,
  });

  const result = {
    date: today,
    total_sources: sources.length,
    failed_sources: sourceFailures,
    total_articles: uniqueAll.length,
    sources: sourceSummaries,
    combined_file: allFile,
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  logger.error(`Fatal error: ${error.message}`);
  process.exitCode = 1;
});
