'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const sources = require('../config/blog-sources.json');

describe('blog sources', () => {
  it('Windows Command Line ブログを公式 RSS で追跡する', () => {
    const source = sources.find((entry) => entry.id === 'commandline-blog');

    assert.ok(source);
    assert.equal(source.name, 'Windows Command Line Blog');
    assert.equal(source.type, 'rss');
    assert.equal(source.url, 'https://devblogs.microsoft.com/commandline/');
    assert.equal(source.feedUrl, 'https://devblogs.microsoft.com/commandline/feed/');
    assert.equal(source.limit, 30);
  });

  it('ブログソースの ID が重複しない', () => {
    assert.equal(new Set(sources.map((source) => source.id)).size, sources.length);
  });
});
