'use strict';

/**
 * generate-daily-page.js のヘルパー関数をテストする。
 * HTTP fetch を伴う部分は除外し、テキスト処理ロジックのみ検証する。
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// --- ヘルパー関数を再現（scripts/generate-daily-page.js と同一） ---

function cleanText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
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
    if (labels.length >= limit) break;
  }
  return labels.length > 0 ? labels : [fallback];
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

// -------------------------------------------------------------------

describe('cleanText', () => {
  it('前後の空白を除去する', () => {
    assert.equal(cleanText('  hello  '), 'hello');
  });

  it('連続する空白を 1 つにまとめる', () => {
    assert.equal(cleanText('a  b   c'), 'a b c');
  });

  it('null / undefined を空文字として扱う', () => {
    assert.equal(cleanText(null), '');
    assert.equal(cleanText(undefined), '');
  });

  it('数値を文字列に変換する', () => {
    assert.equal(cleanText(123), '123');
  });
});

describe('pickRuleLabels', () => {
  it('本文から変更種別を抽出する', () => {
    const result = pickRuleLabels(
      'Announcing general availability and preview updates',
      CHANGE_TYPE_RULES,
      'fallback',
    );
    assert.deepEqual(result, ['一般提供開始', 'プレビュー提供', '新機能・サービスの発表']);
  });

  it('一致するキーワードがない場合はフォールバックを返す', () => {
    assert.deepEqual(pickRuleLabels('', CHANGE_TYPE_RULES, '記事内容の紹介・解説'), [
      '記事内容の紹介・解説',
    ]);
  });
});

describe('buildGroundedSummary', () => {
  it('article テキストがある場合に日本語の変更要約を構築する', () => {
    const article = {
      title: 'Announcing Microsoft Discovery general availability',
      source_name: 'Azure Blog',
      summary: 'Microsoft Discovery is now generally available.',
    };
    const articleText =
      'This article announces general availability for Microsoft Foundry and agentic AI workflows.';
    const result = buildGroundedSummary(article, articleText);
    assert.match(result, /一般提供開始/);
    assert.match(result, /対象領域/);
    assert.match(result, /記事本文/);
  });

  it('articleText が空のとき RSS 概要を根拠にする', () => {
    const article = {
      title: 'Power BI security update',
      source_name: 'Fabric Blog',
      summary: 'Security protection update.',
    };
    const result = buildGroundedSummary(article, '');
    assert.match(result, /RSS 概要/);
    assert.match(result, /セキュリティ・管理機能/);
  });

  it('articleText も baseSummary も空のときタイトルを根拠にする', () => {
    const article = { title: '', source_name: '', summary: '' };
    const result = buildGroundedSummary(article, '');
    assert.match(result, /タイトル/);
    assert.match(result, /記事内容の紹介・解説/);
  });

  it('長い本文でも短い一覧用要約にする', () => {
    const article = {
      title: 'New Azure performance improvements',
      source_name: 'Azure Blog',
      summary: '',
    };
    const longText = Array(20)
      .fill('Azure announces new performance improvements and optimized workloads.')
      .join(' ');
    const result = buildGroundedSummary(article, longText);
    assert.ok(result.length < 300);
  });
});
