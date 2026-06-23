'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { classify, classifyAll, matches, extractFields, DEFAULT_CATEGORY } = require('../examples/classifier/engine');

// 一组覆盖发票/通知/会议/推广/其他 的规则(与 rules.example.json 对齐)
const RULES = [
  {
    name: '发票',
    match: { fromContains: ['invoice', '发票'], subjectContains: ['发票', '账单'] },
    extract: { amount: { pattern: '金额[:：\\s]*([0-9]+[.,]?[0-9]*)\\s*元?', group: 1 } },
  },
  {
    name: '通知',
    match: { fromContains: ['noreply'] },
    extract: { code: { pattern: '(?:验证码[是为]?|verification code)[:：\\s]*([0-9A-Za-z]{4,8})', group: 1 } },
  },
  {
    name: '会议',
    match: { subjectContains: ['会议', '邀请'] },
    extract: {},
  },
];

const mail = (over) => ({
  uid: 1, subject: '', from: { name: '', address: '' }, text: '', date: '2026-06-01T00:00:00Z', ...over,
});

test('发票命中且提取金额', () => {
  const m = mail({ from: { address: 'invoice@x.com' }, subject: '电子发票', text: '金额:1280.50元' });
  const r = classify(m, RULES);
  assert.equal(r.category, '发票');
  assert.equal(r.matchedRule, '发票');
  assert.equal(r.extracted.amount, '1280.50');
});

test('系统通知提取验证码(含"是")', () => {
  const m = mail({ from: { address: 'noreply@x.com' }, subject: '验证码', text: '您的验证码是:482915' });
  const r = classify(m, RULES);
  assert.equal(r.category, '通知');
  assert.equal(r.extracted.code, '482915');
});

test('验证码直接冒号格式', () => {
  const m = mail({ from: { address: 'noreply@x.com' }, text: '验证码:9921' });
  const r = classify(m, RULES);
  assert.equal(r.extracted.code, '9921');
});

test('会议命中', () => {
  const m = mail({ subject: '邀请您参加评审会议' });
  const r = classify(m, RULES);
  assert.equal(r.category, '会议');
});

test('无命中归到默认分类', () => {
  const m = mail({ subject: '周末聚餐', text: '周六吃饭' });
  const r = classify(m, RULES);
  assert.equal(r.category, DEFAULT_CATEGORY);
  assert.equal(r.matchedRule, null);
  assert.deepEqual(r.extracted, {});
});

test('自定义默认分类名', () => {
  const m = mail({ subject: '随便' });
  const r = classify(m, RULES, { defaultCategory: '未分类' });
  assert.equal(r.category, '未分类');
});

test('fromContains 大小写不敏感', () => {
  const m = mail({ from: { address: 'INVOICE@X.COM' }, subject: '发票' });
  assert.ok(matches(m, RULES[0]));
});

test('多条件为「且」关系', () => {
  // from 命中但 subject 不命中 → 不应匹配发票规则
  const m = mail({ from: { address: 'invoice@x.com' }, subject: '无关主题' });
  assert.equal(matches(m, RULES[0]), false);
});

test('subjectRegex 坏正则不命中', () => {
  const rule = { name: 'X', match: { subjectRegex: '(' }, extract: {} };
  const m = mail({ subject: 'anything' });
  assert.equal(matches(m, rule), false);
});

test('classifyAll 批量', () => {
  const list = [
    mail({ from: { address: 'invoice@x.com' }, subject: '发票', text: '金额:100元' }),
    mail({ subject: '聚餐' }),
  ];
  const out = classifyAll(list, RULES);
  assert.equal(out.length, 2);
  assert.equal(out[0].category, '发票');
  assert.equal(out[1].category, DEFAULT_CATEGORY);
  // 原字段保留
  assert.equal(out[0].uid, 1);
});

test('extractFields 独立可用', () => {
  const ex = { no: { pattern: '编号[:：\\s]*(\\w+)', group: 1 } };
  const got = extractFields({ text: '编号:ABC123', subject: '' }, ex);
  assert.equal(got.no, 'ABC123');
});

test('extractFields 无匹配返回空对象', () => {
  const got = extractFields({ text: '无字段', subject: '' }, { x: { pattern: 'a', group: 1 } });
  assert.deepEqual(got, {});
});
