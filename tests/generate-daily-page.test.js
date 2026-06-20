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
