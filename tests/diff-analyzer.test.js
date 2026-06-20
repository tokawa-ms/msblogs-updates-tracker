'use strict';

/**
 * DiffAnalyzer のコアロジックを直接抽出してテストする。
 * ファイル I/O に依存する部分は除外し、純粋なロジックのみ検証する。
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// --- 内部ロジックを再現（scripts/diff-analyzer.js と同一） ---

function dedupeArticles(articles) {
  const seen = new Set();
  return articles.filter((article) => {
    const key = article.url || article.id;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function analyzeSource(todayArticles, yesterdayArticles) {
  const todayUnique = dedupeArticles(todayArticles);
  const yesterdayUnique = dedupeArticles(yesterdayArticles);
  const yesterdayUrls = new Set(yesterdayUnique.map((a) => a.url).filter(Boolean));
  const todayUrls = new Set(todayUnique.map((a) => a.url).filter(Boolean));
  return {
    new_count: todayUnique.filter((a) => !yesterdayUrls.has(a.url)).length,
    removed_count: yesterdayUnique.filter((a) => !todayUrls.has(a.url)).length,
    new_articles: todayUnique.filter((a) => !yesterdayUrls.has(a.url)),
    removed_articles: yesterdayUnique.filter((a) => !todayUrls.has(a.url)),
  };
}

// サンプルデータ
const makeArticle = (url, title = 'Test') => ({ id: url, url, title, published_at: '2026-06-20T00:00:00.000Z' });

describe('dedupeArticles', () => {
  it('重複 URL を排除する', () => {
    const input = [makeArticle('https://a.com'), makeArticle('https://a.com'), makeArticle('https://b.com')];
    const result = dedupeArticles(input);
    assert.equal(result.length, 2);
  });

  it('URL がない場合 id で dedup する', () => {
    const input = [
      { id: 'x', url: '', title: 'A' },
      { id: 'x', url: '', title: 'A dup' },
    ];
    const result = dedupeArticles(input);
    assert.equal(result.length, 1);
  });

  it('空配列を渡すと空配列を返す', () => {
    assert.deepEqual(dedupeArticles([]), []);
  });

  it('URL も id もない記事を除外する', () => {
    const input = [{ url: '', title: 'no id' }];
    const result = dedupeArticles(input);
    assert.equal(result.length, 0);
  });
});

describe('analyzeSource', () => {
  it('新規記事を正しく特定する', () => {
    const today = [makeArticle('https://a.com'), makeArticle('https://b.com')];
    const yesterday = [makeArticle('https://a.com')];
    const result = analyzeSource(today, yesterday);
    assert.equal(result.new_count, 1);
    assert.equal(result.new_articles[0].url, 'https://b.com');
    assert.equal(result.removed_count, 0);
  });

  it('削除記事を正しく特定する', () => {
    const today = [makeArticle('https://a.com')];
    const yesterday = [makeArticle('https://a.com'), makeArticle('https://b.com')];
    const result = analyzeSource(today, yesterday);
    assert.equal(result.removed_count, 1);
    assert.equal(result.removed_articles[0].url, 'https://b.com');
    assert.equal(result.new_count, 0);
  });

  it('変更なしの場合 new_count / removed_count ともに 0 を返す', () => {
    const articles = [makeArticle('https://a.com'), makeArticle('https://b.com')];
    const result = analyzeSource(articles, articles);
    assert.equal(result.new_count, 0);
    assert.equal(result.removed_count, 0);
  });

  it('両方空の場合に new_count: 0 / removed_count: 0 を返す', () => {
    const result = analyzeSource([], []);
    assert.equal(result.new_count, 0);
    assert.equal(result.removed_count, 0);
  });

  it('昨日が空で今日に記事がある場合は全記事が新規扱い', () => {
    const today = [makeArticle('https://a.com'), makeArticle('https://b.com')];
    const result = analyzeSource(today, []);
    assert.equal(result.new_count, 2);
    assert.equal(result.removed_count, 0);
  });

  it('入力内の重複 URL を除去してから比較する', () => {
    const today = [makeArticle('https://a.com'), makeArticle('https://a.com')];
    const yesterday = [makeArticle('https://a.com')];
    const result = analyzeSource(today, yesterday);
    assert.equal(result.new_count, 0);
  });
});
