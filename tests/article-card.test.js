'use strict';

const { before, after, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const cheerio = require('cheerio');

describe('article card language rendering', () => {
  let server;
  let html;

  before(async () => {
    const { dev } = await import('astro');
    server = await dev({
      root: path.resolve(__dirname, '..'),
      base: '/',
      logLevel: 'silent',
      server: { host: '127.0.0.1', port: 0 },
      integrations: [{
        name: 'article-card-test',
        hooks: {
          'astro:config:setup': ({ injectRoute }) => injectRoute({
            pattern: '/test-article-card',
            entrypoint: path.join(__dirname, 'fixtures', 'article-card.astro'),
          }),
        },
      }],
    });
    const response = await fetch(`http://127.0.0.1:${server.address.port}/test-article-card`);
    assert.equal(response.status, 200);
    html = await response.text();
  });

  after(async () => {
    await server?.stop();
  });

  function summaryContent(id, language) {
    const $ = cheerio.load(html);
    const card = $(`#${id} .article-card`);
    card.find(`[data-lang="${language === 'en' ? 'ja' : 'en'}"]`).remove();
    card.find('.card-header, .pill-row, .stats-inline').remove();
    return card;
  }

  it('英語 UI の要約・重要ポイント・重要性を英語で描画する', () => {
    const card = summaryContent('translated', 'en');
    assert.match(card.text(), /Search across Japanese and English documents/);
    assert.match(card.text(), /Why it matters: Teams no longer need separate indexes/);
    assert.match(card.text(), /Key points/);
    assert.deepEqual(card.find('li').toArray().map((item) => cheerio.load(item).text()), [
      'Available to existing paid workspaces in Japan.',
      'Production use is not supported.',
    ]);
    assert.doesNotMatch(card.text(), /[\u3041-\u3096\u30a1-\u30fa\u3400-\u9fff]/u);
  });

  for (const id of ['translated', 'legacy', 'blank']) {
    it(`${id}: 日本語 UI では従来の要約を維持する`, () => {
      const card = summaryContent(id, 'ja');
      assert.match(card.text(), /日本語と英語の文書を横断検索できる/);
      assert.match(card.text(), /なぜ重要か: 言語ごとに別の索引/);
      assert.match(card.text(), /重要ポイント/);
      assert.equal(card.find('li').length, 2);
      assert.doesNotMatch(card.text(), /Why it matters|Key points|English summary/);
    });
  }

  for (const id of ['legacy', 'blank']) {
    it(`${id}: 英訳がなくても英語 UI に日本語を混在させない`, () => {
      const card = summaryContent(id, 'en');
      assert.match(card.text(), /English summary is not available for this article yet/);
      assert.doesNotMatch(card.text(), /[\u3041-\u3096\u30a1-\u30fa\u3400-\u9fff]/u);
      assert.doesNotMatch(card.text(), /Why it matters|Key points/);
      assert.equal(card.find('li').length, 0);
    });
  }
});
