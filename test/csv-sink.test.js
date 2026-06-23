'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildCsv, toRow, collectExtraKeys, escapeCsv, flatten } = require('../examples/workflow/sinks/csv');

const sampleItems = [
  {
    uid: 1, date: '2026-06-01T00:00:00Z', subject: '发票', category: '发票', matchedRule: '发票',
    from: { name: '甲', address: 'a@x.com' },
    extracted: { amount: '100', invoiceNo: 'INV1' }, text: '正文',
  },
  {
    uid: 2, date: '2026-06-02T00:00:00Z', subject: '验证码', category: '通知', matchedRule: '通知',
    from: { name: '', address: 'b@x.com' },
    extracted: { code: '9999' }, text: '第一行\n第二行',
  },
];

test('collectExtraKeys 合并所有 extracted 字段', () => {
  const keys = collectExtraKeys(sampleItems);
  assert.deepEqual([...keys].sort(), ['amount', 'code', 'invoiceNo']);
});

test('escapeCsv 含逗号加引号', () => {
  assert.equal(escapeCsv('a,b'), '"a,b"');
  assert.equal(escapeCsv('简单'), '简单');
  assert.equal(escapeCsv('含"引号'), '"含""引号"');
  assert.equal(escapeCsv('换\n行'), '"换\n行"');
});

test('flatten 去除换行', () => {
  assert.equal(flatten('a\nb\nc'), 'a b c');
  assert.equal(flatten(null), '');
});

test('toRow 把 from 拍平为字符串', () => {
  const row = toRow(sampleItems[0], ['amount']);
  assert.equal(row.from, '甲<a@x.com>');
  assert.equal(row.ext_amount, '100');
});

test('buildCsv 表头含 ext_ 前缀列', () => {
  const csv = buildCsv(sampleItems);
  const header = csv.split('\r\n')[0];
  assert.match(header, /uid,date,from,subject,category,matchedRule,snippet/);
  assert.match(header, /ext_amount/);
  assert.match(header, /ext_invoiceNo/);
  assert.match(header, /ext_code/);
});

test('buildCsv 带 UTF-8 BOM', () => {
  const csv = buildCsv(sampleItems);
  assert.equal(csv.charCodeAt(0), 0xfeff, '应以 BOM 开头');
});

test('buildCsv 提取字段正确填入对应行', () => {
  const csv = buildCsv(sampleItems);
  const lines = csv.split('\r\n');
  // 第一行(发票)应有 100 和 INV1,不应有 code
  assert.match(lines[1], /100/);
  assert.match(lines[1], /INV1/);
  // 第二行(验证码)应有 9999
  assert.match(lines[2], /9999/);
});

test('buildCsv 提取字段与基础 date 列名不冲突', () => {
  // 构造 extracted 含 date 字段,验证不与邮件日期列混淆
  const items = [{
    uid: 1, date: '2026-06-01', subject: 'x', category: 'c', matchedRule: 'c',
    from: { address: 'a@x.com' }, extracted: { date: '发票日期' }, text: '',
  }];
  const csv = buildCsv(items);
  const header = csv.split('\r\n')[0];
  assert.match(header, /date/);          // 邮件日期
  assert.match(header, /ext_date/);      // 提取的发票日期
});

test('buildCsv 空数组至少有表头', () => {
  const csv = buildCsv([]);
  assert.ok(csv.length > 0);
  assert.equal(csv.split('\r\n').length, 2); // 表头 + 末尾空行
});
