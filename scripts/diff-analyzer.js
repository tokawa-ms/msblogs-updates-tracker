const path = require('path');
const {
  ensureCacheDirs,
  diffFile,
  writeJson,
  readJson,
  fileExists,
  listSourceFilesByDate,
  combinedCacheFile,
} = require('./utils/cache-manager');
const { toDateString, getYesterdayDateString } = require('./utils/date-utils');
const logger = require('./utils/logger');

const LEGACY_OUTPUT = path.resolve(__dirname, '..', 'diff-result.json');

function filenameToSourceId(filePath, date) {
  const base = path.basename(filePath);
  return base.replace(`-${date}.json`, '');
}

function dedupeArticles(articles) {
  const seen = new Set();
  return articles.filter((article) => {
    const key = article.url || article.id;
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

class DiffAnalyzer {
  async loadByDate(date) {
    const sourceFiles = await listSourceFilesByDate(date);
    const bySource = {};

    for (const filePath of sourceFiles) {
      const sourceId = filenameToSourceId(filePath, date);
      const records = await readJson(filePath);
      bySource[sourceId] = Array.isArray(records) ? records : [];
    }
    return bySource;
  }

  analyzeSource(todayArticles, yesterdayArticles) {
    const todayUnique = dedupeArticles(todayArticles);
    const yesterdayUnique = dedupeArticles(yesterdayArticles);
    const yesterdayUrls = new Set(yesterdayUnique.map((article) => article.url).filter(Boolean));
    const todayUrls = new Set(todayUnique.map((article) => article.url).filter(Boolean));

    const newArticles = todayUnique.filter((article) => !yesterdayUrls.has(article.url));
    const removedArticles = yesterdayUnique.filter((article) => !todayUrls.has(article.url));

    return {
      new_count: newArticles.length,
      removed_count: removedArticles.length,
      new_articles: newArticles,
      removed_articles: removedArticles,
    };
  }

  async analyze(today, yesterday) {
    const todayData = await this.loadByDate(today);
    const yesterdayData = await this.loadByDate(yesterday);
    const sources = new Set([...Object.keys(todayData), ...Object.keys(yesterdayData)]);

    const bySource = {};
    let totalNew = 0;
    let totalRemoved = 0;
    const allNewArticles = [];

    for (const sourceId of sources) {
      const summary = this.analyzeSource(todayData[sourceId] || [], yesterdayData[sourceId] || []);
      bySource[sourceId] = summary;
      totalNew += summary.new_count;
      totalRemoved += summary.removed_count;
      allNewArticles.push(...summary.new_articles);
    }

    return {
      date: today,
      compared_with: yesterday,
      source_count: sources.size,
      new_count: totalNew,
      removed_count: totalRemoved,
      new_articles: dedupeArticles(allNewArticles),
      by_source: bySource,
      diff_result: totalNew > 0 || totalRemoved > 0,
    };
  }
}

async function readCombinedFallback(date) {
  const file = combinedCacheFile(date);
  if (!(await fileExists(file))) {
    return [];
  }
  const records = await readJson(file);
  return Array.isArray(records) ? records : [];
}

async function main() {
  await ensureCacheDirs();
  const today = process.argv[2] || toDateString();
  const yesterday = process.argv[3] || getYesterdayDateString(new Date(`${today}T00:00:00Z`));
  const analyzer = new DiffAnalyzer();
  const result = await analyzer.analyze(today, yesterday);

  if (result.source_count === 0) {
    logger.warn('No source cache files found. Falling back to combined cache files.');
    const todayCombined = await readCombinedFallback(today);
    const yesterdayCombined = await readCombinedFallback(yesterday);
    const combinedSummary = analyzer.analyzeSource(todayCombined, yesterdayCombined);
    result.source_count = 1;
    result.by_source = { combined: combinedSummary };
    result.new_count = combinedSummary.new_count;
    result.removed_count = combinedSummary.removed_count;
    result.new_articles = combinedSummary.new_articles;
    result.diff_result = result.new_count > 0 || result.removed_count > 0;
  }

  const output = diffFile(today);
  await writeJson(output, result);
  await writeJson(LEGACY_OUTPUT, result);

  console.log(JSON.stringify({ ...result, output_file: output }, null, 2));
}

main().catch((error) => {
  logger.error(`Failed to analyze diff: ${error.message}`);
  process.exitCode = 1;
});
