'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');

// テスト用に一時ディレクトリへ環境をリダイレクトするため、
// モジュールキャッシュをクリアしてから require する
let tmpDir;
let cacheManager;

before(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-manager-test-'));
  // ROOT を tmpDir に見せかけるため、date-utils だけ先にロード
  // cache-manager は ROOT を __dirname/../../ と決め打ちするので
  // テスト用のシンボルだけを個別にテストする
  cacheManager = require('../../scripts/utils/cache-manager');
});

after(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('sourceCacheFile', () => {
  it('ソース ID と日付から正しいパスを返す', () => {
    const result = cacheManager.sourceCacheFile('github-blog', '2026-06-20');
    assert.ok(result.includes('github-blog-2026-06-20.json'));
    assert.ok(result.includes('blogs'));
  });
});

describe('combinedCacheFile', () => {
  it('all- プレフィックスを持つパスを返す', () => {
    const result = cacheManager.combinedCacheFile('2026-06-20');
    assert.ok(result.includes('all-2026-06-20.json'));
  });
});

describe('diffFile', () => {
  it('diff- プレフィックスを持つパスを返す', () => {
    const result = cacheManager.diffFile('2026-06-20');
    assert.ok(result.includes('diff-2026-06-20.json'));
    assert.ok(result.includes('diff'));
  });
});

describe('writeJson / readJson', () => {
  it('JSON を書き込み、読み戻せる', async () => {
    const filePath = path.join(tmpDir, 'test.json');
    const data = { foo: 'bar', num: 42 };
    await cacheManager.writeJson(filePath, data);
    const result = await cacheManager.readJson(filePath);
    assert.deepEqual(result, data);
  });

  it('存在しないディレクトリも自動作成する', async () => {
    const filePath = path.join(tmpDir, 'nested', 'deep', 'test.json');
    await cacheManager.writeJson(filePath, { nested: true });
    const result = await cacheManager.readJson(filePath);
    assert.equal(result.nested, true);
  });
});

describe('fileExists', () => {
  it('存在するファイルに対して true を返す', async () => {
    const filePath = path.join(tmpDir, 'exists.json');
    await fs.writeFile(filePath, '{}', 'utf8');
    assert.equal(await cacheManager.fileExists(filePath), true);
  });

  it('存在しないファイルに対して false を返す', async () => {
    const filePath = path.join(tmpDir, 'not-exists.json');
    assert.equal(await cacheManager.fileExists(filePath), false);
  });
});
