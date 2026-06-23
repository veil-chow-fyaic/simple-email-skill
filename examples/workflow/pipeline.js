'use strict';

// 案例3:完整工作流 pipeline —— 拉取 → 分类 → 字段提取 → 写入表格。
// 它是案例2 的端到端交付版本:把「分类」延展成一份可直接交给人的表格。

// 用法:
//   node examples/workflow/pipeline.js [--limit 50] [--unread] [--since-days 7]
//                                      [--rules rules.json]
//                                      --out ./output/result.csv|.xlsx
//   --format csv|xlsx|both   (不指定则按 --out 后缀推断)
//   --dry-run --in fixture.json  离线模式(用分类 fixture 跑全链路,只到写文件前打印)

const path = require('path');
const fs = require('fs');
const { classifyAll } = require('../classifier/engine');
const { writeCsv } = require('./sinks/csv');
const { writeXlsx } = require('./sinks/xlsx');
const { openImap } = require('../../scripts/lib/client');
const { normalize, snippet } = require('../../scripts/lib/format');

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (next != null && !next.startsWith('--')) { opts[key] = next; i++; }
      else opts[key] = true;
    } else opts._.push(a);
  }
  return opts;
}

function loadRules(file) {
  const p = path.resolve(file || path.join(__dirname, '..', 'classifier', 'rules.json'));
  if (!fs.existsSync(p)) {
    const example = path.join(__dirname, '..', 'classifier', 'rules.example.json');
    return JSON.parse(fs.readFileSync(example, 'utf8'));
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) return help();

  const ruleset = loadRules(opts.rules);
  const rules = ruleset.rules || [];
  const defaultCategory = ruleset.defaultCategory || '其他';

  // 1) 拉取
  let mails;
  if (opts['dry-run'] || opts.in) {
    const fixture = opts.in
      ? path.resolve(opts.in)
      : path.join(__dirname, '..', 'classifier', 'fixture.json');
    mails = JSON.parse(fs.readFileSync(fixture, 'utf8'));
  } else {
    mails = await fetchMails(opts);
  }

  // 2) 分类 + 提取
  const classified = classifyAll(mails, rules, { defaultCategory });

  const summary = {};
  for (const m of classified) summary[m.category] = (summary[m.category] || 0) + 1;

  console.error(`[pipeline] 拉取 ${mails.length} 封,分类完成:${JSON.stringify(summary)}`);

  if (opts['dry-run']) {
    process.stdout.write(JSON.stringify({ total: classified.length, summary, items: classified }, null, 2) + '\n');
    return;
  }

  // 3) 写表
  if (!opts.out) {
    console.error('需要 --out <文件路径>(.csv 或 .xlsx),或加 --dry-run 仅预览');
    process.exit(2);
  }
  const format = opts.format || inferFormat(opts.out);
  const out = path.resolve(opts.out);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const written = [];

  if (format === 'csv' || format === 'both') {
    const csvPath = format === 'both' ? stripTableExt(out) + '.csv' : out;
    const r = writeCsv(classified, csvPath);
    written.push(r);
  }
  if (format === 'xlsx' || format === 'both') {
    const xlsxPath = format === 'both' ? stripTableExt(out) + '.xlsx' : out;
    const r = await writeXlsx(classified, xlsxPath);
    written.push(r);
  }

  console.log(JSON.stringify({ ok: true, total: classified.length, summary, written }, null, 2));
}

function inferFormat(filePath) {
  if (/\.xlsx$/i.test(filePath)) return 'xlsx';
  if (/\.csv$/i.test(filePath)) return 'csv';
  return 'csv';
}

// 去掉路径的已知表格扩展名,得到「基础名」,便于 both 模式追加 .csv/.xlsx
function stripTableExt(p) {
  return p.replace(/\.(xlsx|csv)$/i, '');
}

async function fetchMails(opts) {
  const mailbox = opts.mailbox || process.env.EMAIL_MAILBOX || 'INBOX';
  const limit = parseInt(opts.limit, 10) || 50;
  const onlyUnread = !!opts.unread;
  const sinceDays = parseInt(opts['since-days'], 10);

  const client = await openImap();
  try {
    const lock = await client.getMailboxLock(mailbox);
    try {
      const search = {};
      if (onlyUnread) search.seen = false;
      else search.all = true;
      if (sinceDays) {
        const d = new Date(Date.now() - sinceDays * 86400000);
        search.since = d;
      }
      const uids = await client.search(search);
      const last = uids.slice(-limit).reverse();
      const out = [];
      for await (const m of client.fetch(last, { envelope: true, source: true, flags: true, internalDate: true }, { uid: true })) {
        const norm = await normalize(m, { includeBody: true });
        norm.text = snippet(norm.text, 800);
        norm.html = '';
        out.push(norm);
      }
      return out;
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

function help() {
  console.log(`simple-email · 案例3:完整工作流 pipeline

把「案例2 分类」延展为可交付的端到端流程:
  拉取邮件 → 规则分类 → 字段提取 → 写入表格(CSV / xlsx)

用法:
  node examples/workflow/pipeline.js --out ./output/result.xlsx [--limit 50] [--unread] [--since-days 7]
  node examples/workflow/pipeline.js --out ./output/result.csv --format csv
  node examples/workflow/pipeline.js --out ./output/result --format both   # 同时出 csv+xlsx

  离线预览(不联网、不写文件):
  node examples/workflow/pipeline.js --dry-run --in fixture.json

自定义分类规则、接 LLM、换 sink,见 docs/extend-guide.md。`);
}

main().catch((e) => {
  console.error('错误:' + (e.message || e));
  process.exit(1);
});
