'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { snippet } = require('../scripts/lib/format');

test('snippet 短文本原样返回', () => {
  assert.equal(snippet('短文本'), '短文本');
  assert.equal(snippet(''), '');
  assert.equal(snippet(null), '');
});

test('snippet 长文本截断并加省略号', () => {
  const long = '一二三四五六七八九十一二三四五六七八九十';
  const out = snippet(long, 10);
  assert.ok(out.endsWith('…'));
  assert.ok(out.length < long.length + 2);
});

test('snippet 压缩空白', () => {
  assert.equal(snippet('a   b\n\nc'), 'a b c');
});
