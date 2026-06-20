import { getCollection, type CollectionEntry } from 'astro:content';
import categoryNames from '../../config/categories.json';

export type UpdateEntry = CollectionEntry<'updates'>;
export type UpdateArticle = UpdateEntry['data']['articles'][number];

export interface CategoryDefinition {
  name: string;
  slug: string;
  description: string;
}

export interface ImportanceDefinition {
  label: 'Critical' | 'High' | 'Medium' | 'Low';
  badge: string;
}

export interface ArticleWithMeta extends UpdateArticle {
  updateSlug: string;
  updateDate: Date;
  categories: string[];
  importance: ImportanceDefinition;
}

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  AI: 'Copilot、モデル、エージェント、生成 AI の更新を集約します。',
  'Developer Tools': 'GitHub、VS Code、開発体験、CI/CD に関するアップデートです。',
  Cloud: 'Azure を中心としたクラウド基盤、運用、インフラ関連の更新です。',
  Security: '脆弱性対応、認証、ゼロトラスト、コンプライアンスに関する変更です。',
  Productivity: 'Teams、Outlook、Microsoft 365 など業務生産性に関する更新です。',
  'Data & Analytics': 'Fabric、Power BI、データ基盤、分析ワークロードの更新です。',
};

const SOURCE_CATEGORY_MAP: Record<string, string[]> = {
  'github-blog': ['Developer Tools'],
  'vscode-blog': ['Developer Tools'],
  'azure-blog': ['Cloud'],
  'm365-blog': ['Productivity'],
  'fabric-blog': ['Data & Analytics'],
  'microsoft-ai-blog': ['AI'],
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  AI: ['ai', 'copilot', 'agent', 'model', 'llm', 'machine learning', 'openai'],
  'Developer Tools': ['github', 'vscode', 'visual studio', 'codespaces', 'actions', 'extension', 'devops'],
  Cloud: ['azure', 'kubernetes', 'container', 'cloud', 'infrastructure', 'serverless'],
  Security: ['security', 'identity', 'compliance', 'vulnerability', 'cve', 'defender', 'zero trust'],
  Productivity: ['microsoft 365', 'teams', 'outlook', 'office', 'productivity', 'copilot for microsoft 365'],
  'Data & Analytics': ['fabric', 'power bi', 'analytics', 'lakehouse', 'data', 'warehouse', 'semantic model'],
};

const IMPORTANCE_RULES: Array<{ keywords: string[]; importance: ImportanceDefinition }> = [
  {
    keywords: ['critical vulnerability', 'cve', 'security incident', 'service outage', 'breach'],
    importance: { label: 'Critical', badge: '🔴 Critical' },
  },
  {
    keywords: ['breaking change', 'deprecated', 'deprecation', 'end of support', 'security', 'retire', 'retirement'],
    importance: { label: 'High', badge: '🟠 High' },
  },
  {
    keywords: ['announc', 'launch', 'release', 'general availability', 'preview', 'feature update', 'new feature'],
    importance: { label: 'Medium', badge: '🟡 Medium' },
  },
];

export const CATEGORY_DEFINITIONS: CategoryDefinition[] = categoryNames.map((name) => ({
  name,
  slug: slugify(name),
  description: CATEGORY_DESCRIPTIONS[name] || `${name} に関する更新です。`,
}));

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/gu, 'and')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
}

export function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }
  return new Intl.DateTimeFormat('ja-JP', { dateStyle: 'long' }).format(date);
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export async function getPublishedUpdates() {
  const entries = await getCollection('updates');
  return entries
    .filter((entry) => !entry.data.draft && !entry.data.hidden)
    .sort((left, right) => right.data.date.getTime() - left.data.date.getTime());
}

export function getCategoryBySlug(slug: string) {
  return CATEGORY_DEFINITIONS.find((category) => category.slug === slug);
}

export function getUpdateSlug(entry: UpdateEntry) {
  return entry.id.replace(/\.md$/u, '');
}

export function detectCategories(article: UpdateArticle) {
  const categories = new Set(SOURCE_CATEGORY_MAP[article.sourceId] || []);
  const haystack = `${article.sourceName} ${article.title} ${article.summary}`.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => haystack.includes(keyword))) {
      categories.add(category);
    }
  }

  return categories.size > 0 ? Array.from(categories) : ['Developer Tools'];
}

export function detectImportance(article: UpdateArticle) {
  const haystack = `${article.title} ${article.summary}`.toLowerCase();
  const matched = IMPORTANCE_RULES.find((rule) =>
    rule.keywords.some((keyword) => haystack.includes(keyword)),
  );

  return matched?.importance || { label: 'Low', badge: '🟢 Low' };
}

export function withArticleMeta(entry: UpdateEntry, article: UpdateArticle): ArticleWithMeta {
  return {
    ...article,
    updateSlug: getUpdateSlug(entry),
    updateDate: entry.data.date,
    categories: detectCategories(article),
    importance: detectImportance(article),
  };
}

export function getGroupedArticles(entry: UpdateEntry) {
  const groups = new Map<string, { sourceName: string; articles: ArticleWithMeta[] }>();

  for (const article of entry.data.articles) {
    const key = article.sourceId || article.sourceName;
    if (!groups.has(key)) {
      groups.set(key, {
        sourceName: article.sourceName,
        articles: [],
      });
    }
    groups.get(key)?.articles.push(withArticleMeta(entry, article));
  }

  return Array.from(groups.entries()).map(([sourceId, value]) => ({
    sourceId,
    sourceName: value.sourceName,
    articles: value.articles.sort((left, right) => left.title.localeCompare(right.title)),
  }));
}

export function getRecentArticles(entries: UpdateEntry[], limit = 12) {
  return entries
    .flatMap((entry) => entry.data.articles.map((article) => withArticleMeta(entry, article)))
    .sort((left, right) => right.updateDate.getTime() - left.updateDate.getTime())
    .slice(0, limit);
}

export function getCategoryCounts(entries: UpdateEntry[]) {
  const counts = new Map<string, number>();
  for (const category of CATEGORY_DEFINITIONS) {
    counts.set(category.name, 0);
  }

  for (const entry of entries) {
    for (const article of entry.data.articles) {
      for (const category of detectCategories(article)) {
        counts.set(category, (counts.get(category) || 0) + 1);
      }
    }
  }

  return CATEGORY_DEFINITIONS.map((category) => ({
    ...category,
    count: counts.get(category.name) || 0,
  }));
}

export function getCategoryArticles(entries: UpdateEntry[], categoryName: string) {
  return entries
    .flatMap((entry) =>
      entry.data.articles
        .filter((article) => detectCategories(article).includes(categoryName))
        .map((article) => withArticleMeta(entry, article)),
    )
    .sort((left, right) => right.updateDate.getTime() - left.updateDate.getTime());
}
