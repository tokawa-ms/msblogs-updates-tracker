'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  toDateString,
  isDateString,
  getYesterdayDateString,
  parseToIsoString,
} = require('../../scripts/utils/date-utils');

describe('toDateString', () => {
  it('固定日付を YYYY-MM-DD 形式で返す', () => {
    const date = new Date('2026-06-20T12:00:00Z');
    assert.equal(toDateString(date), '2026-06-20');
  });

  it('引数なしで今日の日付を返す', () => {
    const result = toDateString();
    assert.match(result, /^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('getYesterdayDateString', () => {
  it('指定日の前日を YYYY-MM-DD 形式で返す', () => {
    const base = new Date('2026-06-20T00:00:00Z');
    assert.equal(getYesterdayDateString(base), '2026-06-19');
  });

  it('月またぎで正しく前日を返す', () => {
    const base = new Date('2026-07-01T00:00:00Z');
    assert.equal(getYesterdayDateString(base), '2026-06-30');
  });

  it('年またぎで正しく前日を返す', () => {
    const base = new Date('2027-01-01T00:00:00Z');
    assert.equal(getYesterdayDateString(base), '2026-12-31');
  });

  it('引数なしで昨日の日付を返す（形式チェック）', () => {
    const result = getYesterdayDateString();
    assert.match(result, /^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('isDateString', () => {
  it('YYYY-MM-DD 形式だけ true を返す', () => {
    assert.equal(isDateString('2026-06-20'), true);
    assert.equal(isDateString('2026-6-20'), false);
    assert.equal(isDateString('2026-06-20T00:00:00Z'), false);
    assert.equal(isDateString(null), false);
  });
});

describe('parseToIsoString', () => {
  it('ISO 形式の文字列を ISO 文字列に変換する', () => {
    const result = parseToIsoString('2026-06-20T10:30:00Z');
    assert.equal(result, '2026-06-20T10:30:00.000Z');
  });

  it('RFC 2822 形式の文字列を変換する', () => {
    const result = parseToIsoString('Sat, 20 Jun 2026 10:30:00 +0000');
    assert.ok(result && result.startsWith('2026-06-20'));
  });

  it('null を渡すと null を返す', () => {
    assert.equal(parseToIsoString(null), null);
  });

  it('undefined を渡すと null を返す', () => {
    assert.equal(parseToIsoString(undefined), null);
  });

  it('空文字列を渡すと null を返す', () => {
    assert.equal(parseToIsoString(''), null);
  });

  it('不正な文字列を渡すと null を返す', () => {
    assert.equal(parseToIsoString('not-a-date'), null);
  });
});
