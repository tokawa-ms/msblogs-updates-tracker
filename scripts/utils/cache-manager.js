const fs = require('fs/promises');
const path = require('path');
const { toDateString } = require('./date-utils');

const ROOT = path.resolve(__dirname, '..', '..');
const CACHE_DIR = path.join(ROOT, 'cache');
const BLOG_CACHE_DIR = path.join(CACHE_DIR, 'blogs');
const DIFF_CACHE_DIR = path.join(CACHE_DIR, 'diff');
const MANIFEST_FILE = path.join(CACHE_DIR, 'manifest.json');

async function ensureCacheDirs() {
  await fs.mkdir(BLOG_CACHE_DIR, { recursive: true });
  await fs.mkdir(DIFF_CACHE_DIR, { recursive: true });
}

function sourceCacheFile(sourceId, date = toDateString()) {
  return path.join(BLOG_CACHE_DIR, `${sourceId}-${date}.json`);
}

function combinedCacheFile(date = toDateString()) {
  return path.join(BLOG_CACHE_DIR, `all-${date}.json`);
}

function diffFile(date = toDateString()) {
  return path.join(DIFF_CACHE_DIR, `diff-${date}.json`);
}

async function writeJson(filePath, data) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function readJson(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listSourceFilesByDate(date) {
  await ensureCacheDirs();
  const files = await fs.readdir(BLOG_CACHE_DIR);
  return files
    .filter((file) => file.endsWith(`-${date}.json`))
    .filter((file) => !file.startsWith('all-'))
    .map((file) => path.join(BLOG_CACHE_DIR, file));
}

async function updateManifest(payload) {
  let existing = {
    history: [],
  };
  if (await fileExists(MANIFEST_FILE)) {
    existing = await readJson(MANIFEST_FILE);
  }
  const next = {
    ...existing,
    last_run: payload.last_run,
    history: [...(existing.history || []), payload].slice(-30),
  };
  await writeJson(MANIFEST_FILE, next);
}

module.exports = {
  BLOG_CACHE_DIR,
  DIFF_CACHE_DIR,
  MANIFEST_FILE,
  ensureCacheDirs,
  sourceCacheFile,
  combinedCacheFile,
  diffFile,
  writeJson,
  readJson,
  fileExists,
  listSourceFilesByDate,
  updateManifest,
};
