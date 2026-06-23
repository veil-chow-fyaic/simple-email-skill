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

test('snippet 过滤 HTML 标签', () => {
  // 标签替换为空格,正文保留
  assert.equal(snippet('<img src="x.png">正文</img>').trim(), '正文');
  assert.equal(snippet('<b>加粗</b>内容').replace(/\s/g, ''), '加粗内容');
});

test('snippet 过滤 URL 噪音', () => {
  // URL 被移除,正文保留(注意 URL 后需有空格分隔,否则粘连字符会被吃掉)
  const noisy = 'https://img.alicdn.com/abc.png 喵~亲爱的用户：你好';
  const out = snippet(noisy);
  assert.ok(!out.includes('https'), '不应残留 URL');
  assert.ok(out.includes('亲爱的用户'), '正文应保留');
});

test('snippet HTML + URL 混合清洗', () => {
  const messy = '<img src="https://x.com/a.png">http://tmall.com 订单已发货';
  const out = snippet(messy);
  assert.ok(!out.includes('http'));
  assert.ok(!out.includes('<'));
  assert.ok(out.includes('订单已发货'));
});
