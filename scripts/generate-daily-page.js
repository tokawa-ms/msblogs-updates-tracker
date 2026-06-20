const fs = require('fs/promises');
const path = require('path');
const { toDateString } = require('./utils/date-utils');
const { diffFile, fileExists, readJson } = require('./utils/cache-manager');

const ROOT = path.resolve(__dirname, '..');
const UPDATES_DIR = path.join(ROOT, 'content', 'updates');
const INDEX_FILE = path.join(UPDATES_DIR, 'index.md');

function toMarkdown(date, diff) {
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
    for (const article of diff.new_articles) {
      lines.push(`- [${article.title}](${article.url})`);
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
  const markdown = toMarkdown(date, diff);
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
