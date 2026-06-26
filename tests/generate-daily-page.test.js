'use strict';

/**
 * generate-daily-page.js のヘルパー関数をテストする。
 * HTTP fetch を伴う部分は除外し、テキスト処理ロジックのみ検証する。
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// --- scripts/generate-daily-page.js のテキスト処理ヘルパーをテスト用に再現 ---

function cleanText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitSentences(text) {
  const normalized = cleanText(text);
  if (!normalized) return [];
  return normalized
    .split(/(?<=[.!?。！？])\s+/)
    .map((s) => cleanText(s))
    .filter((s) => s.length > 20);
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
    if (next.length > targetMax) break;
    summary = next;
    if (summary.length >= targetMin) break;
  }
  if (!summary) summary = sourceSentences[0];
  if (summary.length > targetMax) summary = `${summary.slice(0, targetMax - 3).trim()}...`;
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
];

const JAPANESE_ACTION_RULES = [
  {
    keywords: ['general availability', 'ga', 'available', 'launch', 'released', 'introducing'],
    text: '新機能またはサービス提供開始の内容です。',
  },
  {
    keywords: ['performance', 'efficiency', 'improve', 'improvement', 'best practices'],
    text: '性能改善やベストプラクティスに関する解説です。',
  },
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function includesKeyword(haystack, keyword) {
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(keyword)}([^a-z0-9]|$)`, 'u').test(haystack);
}

function findJapaneseRuleText(text, rules, fallback) {
  const haystack = cleanText(text).toLowerCase();
  // Rules are evaluated in array order so higher-priority matches can be placed first.
  return rules.find((rule) => rule.keywords.some((keyword) => includesKeyword(haystack, keyword)))?.text || fallback;
}

function getArticleDetailSentence(article, englishSummary) {
  const title = cleanText(article.title).toLowerCase();
  const candidates = splitSentences(`${englishSummary} ${article.summary}`).filter((sentence) => {
    const normalized = sentence.toLowerCase();
    return (
      !normalized.includes(' appeared first on ') &&
      !normalized.startsWith('the post ') &&
      normalized !== title
    );
  });

  const detail = candidates[0] || cleanText(englishSummary) || cleanText(article.summary);
  if (!detail) return '';

  return detail.length > 220 ? `${detail.slice(0, 217).trim()}...` : detail;
}

function buildJapaneseDetailText(article, englishSummary) {
  const detail = getArticleDetailSentence(article, englishSummary);
  if (!detail) {
    return '一覧では、関連する発表内容、変更点、確認すべき観点を短く整理しています。';
  }

  return `具体的には、原文要約で「${detail}」と説明されており、読者は発表の狙い、対象となる機能やサービス、確認すべき影響を一覧上で把握できます。`;
}

function generateJapaneseSummaryFromRules(article, englishSummary) {
  const title = cleanText(article.title) || '無題の記事';
  const sourceName = cleanText(article.source_name) || cleanText(article.source_id) || 'Microsoft 関連ブログ';
  const haystack = `${title} ${englishSummary} ${article.summary}`;
  const action = findJapaneseRuleText(haystack, JAPANESE_ACTION_RULES, '発表内容や変更点の概要を確認できます。');
  const topic = findJapaneseRuleText(
    haystack,
    JAPANESE_TOPIC_RULES,
    'Microsoft と GitHub の技術情報に関する更新を確認できます。',
  );
  const detail = buildJapaneseDetailText(article, englishSummary);

  return `${sourceName} で「${title}」が公開されました。${action}${topic}${detail}`;
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

describe('splitSentences', () => {
  it('文末記号で分割する', () => {
    const text = 'This is sentence one. This is sentence two that is longer. Another sentence here.';
    const result = splitSentences(text);
    assert.ok(result.length >= 2);
    assert.ok(result.every((s) => s.length > 20));
  });

  it('空文字列では空配列を返す', () => {
    assert.deepEqual(splitSentences(''), []);
  });

  it('20 文字以下の短いセグメントを除外する', () => {
    const text = 'Short. This is a sufficiently long sentence that passes the filter.';
    const result = splitSentences(text);
    assert.ok(result.every((s) => s.length > 20));
  });
});

describe('buildGroundedSummary', () => {
  it('article テキストがある場合にソーステキストから要約を構築する', () => {
    const article = { summary: 'Base summary.' };
    const articleText = Array(5)
      .fill('This is a detailed sentence about the topic that provides meaningful context for the reader.')
      .join(' ');
    const result = buildGroundedSummary(article, articleText);
    assert.ok(result.length > 0);
    assert.ok(result.length <= 1300);
  });

  it('articleText が空のとき baseSummary を返す', () => {
    const article = { summary: 'Fallback summary.' };
    const result = buildGroundedSummary(article, '');
    assert.equal(result, 'Fallback summary.');
  });

  it('articleText も baseSummary も空のときデフォルトメッセージを返す', () => {
    const article = { summary: '' };
    const result = buildGroundedSummary(article, '');
    assert.ok(result.includes('Please refer to the original URL'));
  });

  it('長すぎる要約は targetMax 文字で切り詰める', () => {
    const article = { summary: 'x'.repeat(100) };
    const longText = Array(20)
      .fill('This is a very detailed and comprehensive sentence about the technical topic being discussed here.')
      .join(' ');
    const result = buildGroundedSummary(article, longText);
    assert.ok(result.length <= 420);
  });
});

describe('generateJapaneseSummaryFromRules', () => {
  it('日本語の主表示用要約を生成する', () => {
    const result = generateJapaneseSummaryFromRules(
      { title: 'Improving Copilot agent performance', source_name: 'GitHub Blog', summary: '' },
      'This post explains performance and efficiency improvements for Copilot agents.',
    );

    assert.ok(result.startsWith('GitHub Blog で「Improving Copilot agent performance」が公開されました。'));
    assert.match(result, /性能改善|Copilot/);
  });

  it('タイトルやソースが空でもフォールバックを返す', () => {
    const result = generateJapaneseSummaryFromRules({ title: '', source_name: '', source_id: '', summary: '' }, '');

    assert.equal(
      result,
      'Microsoft 関連ブログ で「無題の記事」が公開されました。発表内容や変更点の概要を確認できます。Microsoft と GitHub の技術情報に関する更新を確認できます。一覧では、関連する発表内容、変更点、確認すべき観点を短く整理しています。',
    );
  });

  it('キーワードは単語境界で一致させる', () => {
    const result = generateJapaneseSummaryFromRules(
      { title: 'Reliable availability update', source_name: 'Azure Blog', summary: '' },
      '',
    );

    assert.doesNotMatch(result, /新機能またはサービス提供開始/);
  });

  it('原文要約から具体的な詳細を含める', () => {
    const result = generateJapaneseSummaryFromRules(
      {
        title: 'Copilot task evaluation',
        source_name: 'GitHub Blog',
        summary: 'The post Copilot task evaluation appeared first on The GitHub Blog.',
      },
      'The evaluation compares more than 20 models across repository tasks and highlights token efficiency for agent workflows.',
    );

    assert.match(result, /more than 20 models/);
    assert.match(result, /一覧上で把握できます/);
    assert.doesNotMatch(result, /appeared first on/);
  });
});
