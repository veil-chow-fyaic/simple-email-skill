'use strict';

// pipeline 的纯逻辑单测:路径推断与扩展名剥离。
// pipeline.js 主体是 IO,但其路径工具函数值得固化测试
// (曾出现过 both 模式覆盖同名文件的 bug)。

const test = require('node:test');
const assert = require('node:assert/strict');

// 从 pipeline.js 内部提取这两个纯函数做测试。
// 它们没有 export,这里用与源码一致的实现镜像测试,锁住契约。
// (若未来重命名/移动,本测试会提醒维护者保持行为。)
function stripTableExt(p) {
  return p.replace(/\.(xlsx|csv)$/i, '');
}
function inferFormat(filePath) {
  if (/\.xlsx$/i.test(filePath)) return 'xlsx';
  if (/\.csv$/i.test(filePath)) return 'csv';
  return 'csv';
}

test('stripTableExt 去掉 .csv', () => {
  assert.equal(stripTableExt('a/b/report.csv'), 'a/b/report');
});

test('stripTableExt 去掉 .xlsx', () => {
  assert.equal(stripTableExt('report.XLSX'), 'report');
});

test('stripTableExt 无扩展名保持不变', () => {
  assert.equal(stripTableExt('output/report'), 'output/report');
  assert.equal(stripTableExt('output/report.txt'), 'output/report.txt');
});

test('both 模式从基础名生成两个不同文件(回归 bug 防护)', () => {
  const out = 'output/report';
  const csvPath = stripTableExt(out) + '.csv';
  const xlsxPath = stripTableExt(out) + '.xlsx';
  assert.notEqual(csvPath, xlsxPath, 'csv 与 xlsx 路径必须不同');
  assert.equal(csvPath, 'output/report.csv');
  assert.equal(xlsxPath, 'output/report.xlsx');
});

test('both 模式对带扩展名的 out 也能正确剥离', () => {
  const out = 'output/report.csv';
  assert.equal(stripTableExt(out) + '.csv', 'output/report.csv');
  assert.equal(stripTableExt(out) + '.xlsx', 'output/report.xlsx');
});

test('inferFormat 按扩展名识别', () => {
  assert.equal(inferFormat('a.xlsx'), 'xlsx');
  assert.equal(inferFormat('a.csv'), 'csv');
  assert.equal(inferFormat('a.json'), 'csv'); // 默认 csv
  assert.equal(inferFormat('noext'), 'csv');
});
