'use strict';

// CSV sink:把分类结果写成 CSV。
// 纯逻辑(除文件写入),可单测 buildCsv / toRow。
// 设计要点:提取字段(extracted)统一加 ext_ 前缀,避免和基础列重名
// (例如邮件日期 date vs 提取的发票日期 date)。

const fs = require('fs');

const BASE_FIELDS = [
  'uid', 'date', 'from', 'subject', 'category', 'matchedRule', 'snippet',
];

// 把一行对象拍平为表格行。提取字段逐个展开为 ext_<key> 列。
function toRow(item, extraKeys) {
  const ex = item.extracted || {};
  const row = {
    uid: item.uid ?? '',
    date: item.date ?? '',
    from: item.from ? `${item.from.name || ''}<${item.from.address}>` : '',
    subject: item.subject ?? '',
    category: item.category ?? '',
    matchedRule: item.matchedRule ?? '',
    // 摘要:优先用 snippet,退回 text,去掉换行避免破坏 CSV 结构
    snippet: flatten(item.snippet ?? (item.text ? String(item.text) : '')).slice(0, 80),
  };
  for (const k of extraKeys) {
    row['ext_' + k] = ex[k] != null ? flatten(ex[k]) : '';
  }
  return row;
}

function flatten(v) {
  return String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').trim();
}

function escapeCsv(v) {
  const s = String(v == null ? '' : v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

// 收集所有出现过的 extracted 字段名(保证列对齐)
function collectExtraKeys(items) {
  const set = new Set();
  for (const it of items) {
    for (const k of Object.keys(it.extracted || {})) set.add(k);
  }
  return [...set];
}

/**
 * 构造 CSV 文本(便于单测)。
 */
function buildCsv(items, fields) {
  const extraKeys = collectExtraKeys(items);
  const cols = fields || [...BASE_FIELDS, ...extraKeys.map((k) => 'ext_' + k)];
  const header = cols.map(escapeCsv).join(',');
  const rows = items.map((item) => {
    const row = toRow(item, extraKeys);
    return cols.map((c) => escapeCsv(row[c] != null ? row[c] : '')).join(',');
  });
  // BOM 让 Excel 正确识别 UTF-8
  return '\ufeff' + [header, ...rows].join('\r\n') + '\r\n';
}

/**
 * 写 CSV 到文件。
 */
function writeCsv(items, filePath, fields) {
  const text = buildCsv(items, fields);
  fs.writeFileSync(filePath, text);
  return { path: filePath, rows: items.length, bytes: Buffer.byteLength(text) };
}

module.exports = { writeCsv, buildCsv, toRow, collectExtraKeys, escapeCsv, flatten, BASE_FIELDS };
