'use strict';

// xlsx sink:把分类结果写成 .xlsx(带表头格式)。
// 依赖 exceljs(在 package.json 中为 optionalDependencies)。
// 若未安装,给出清晰提示而非崩溃;CSV 仍可用作兜底。

const path = require('path');

async function writeXlsx(items, filePath) {
  let ExcelJS;
  try {
    ExcelJS = require('exceljs');
  } catch {
    throw new Error(
      '未安装 exceljs(可选依赖)。请运行 `npm install exceljs`,或改用 --format csv 输出。'
    );
  }
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('邮件分类', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  // 收集所有 extracted 字段作为额外列
  const extra = new Set();
  for (const it of items) {
    for (const k of Object.keys(it.extracted || {})) extra.add(k);
  }
  const baseCols = [
    { header: 'UID', key: 'uid', width: 10 },
    { header: '日期', key: 'date', width: 22 },
    { header: '发件人', key: 'from', width: 32 },
    { header: '主题', key: 'subject', width: 40 },
    { header: '分类', key: 'category', width: 14 },
    { header: '命中规则', key: 'matchedRule', width: 16 },
  ];
  const extraCols = [...extra].map((k) => ({ header: 'ext_' + k, key: 'ext_' + k, width: 18 }));
  const tailCols = [{ header: '摘要', key: 'snippet', width: 50 }];
  ws.columns = [...baseCols, ...extraCols, ...tailCols];

  // 表头样式
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } };

  // 按分类着色
  const colorMap = {
    '发票/账单': 'FFFFF3E0',
    '系统通知': 'FFE3F2FD',
    '会议/日程': 'FFE8F5E9',
    '订阅/推广': 'FFFCE4EC',
    '其他': 'FFF5F5F5',
  };

  for (const it of items) {
    const row = {
      uid: it.uid ?? '',
      date: it.date ?? '',
      from: it.from ? `${it.from.name || ''}<${it.from.address}>` : '',
      subject: it.subject ?? '',
      category: it.category ?? '',
      matchedRule: it.matchedRule ?? '',
      snippet: it.snippet ?? (it.text ? String(it.text).slice(0, 80) : ''),
    };
    for (const k of extra) row['ext_' + k] = (it.extracted && it.extracted[k]) || '';
    const r = ws.addRow(row);
    const fill = colorMap[it.category];
    if (fill) {
      r.getCell('category').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
    }
  }

  await wb.xlsx.writeFile(filePath);
  return { path: filePath, rows: items.length };
}

module.exports = { writeXlsx };
