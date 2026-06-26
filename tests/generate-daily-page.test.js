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

  describe('buildJapaneseSummary', () => {
    it('日本語の主表示用要約を生成する', () => {
      const result = buildJapaneseSummary(
        { title: 'Improving Copilot agent performance', source_name: 'GitHub Blog', summary: '' },
        'This post explains performance and efficiency improvements for Copilot agents.',
      );

      assert.ok(result.startsWith('GitHub Blog で「Improving Copilot agent performance」が公開されました。'));
      assert.match(result, /性能改善|Copilot/);
    });

    it('タイトルやソースが空でもフォールバックを返す', () => {
      const result = buildJapaneseSummary({ title: '', source_name: '', source_id: '', summary: '' }, '');

      assert.ok(result.includes('Microsoft 関連ブログ'));
      assert.ok(result.includes('無題の記事'));
    });
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
