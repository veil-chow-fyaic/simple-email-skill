'use strict';

// 案例2:规则分类 + 字段提取 CLI。
// 演示核心 skill 如何向下游延展:复用 scripts/lib 收信,加规则引擎做分类。

// 用法:
//   node examples/classifier/classify.js --limit 20 [--mailbox X] [--unread]
//                                        [--rules rules.json] [--out result.json]
//                                        [--since-days 7]
//   不联网(测试):node examples/classifier/classify.js --dry-run --in fixture.json

const path = require('path');
const fs = require('fs');
const { classifyAll } = require('./engine');
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
  const p = path.resolve(file || path.join(__dirname, 'rules.json'));
  if (!fs.existsSync(p)) {
    // 退回到示例规则
    const example = path.join(__dirname, 'rules.example.json');
    if (fs.existsSync(example)) return JSON.parse(fs.readFileSync(example, 'utf8'));
    return { rules: [], defaultCategory: '其他' };
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) return help();
  const ruleset = loadRules(opts.rules);
  const rules = ruleset.rules || ruleset || [];
  const defaultCategory = ruleset.defaultCategory || '其他';

  let mails;
  if (opts['dry-run'] || opts.in) {
    // 离线模式:从 JSON 文件读取标准化邮件数组
    const fixture = opts.in
      ? path.resolve(opts.in)
      : path.join(__dirname, 'fixture.json');
    mails = JSON.parse(fs.readFileSync(fixture, 'utf8'));
  } else {
    mails = await fetchMails(opts);
  }

  const classified = classifyAll(mails, rules, { defaultCategory });

  // 统计摘要
  const summary = {};
  for (const m of classified) summary[m.category] = (summary[m.category] || 0) + 1;

  const result = {
    total: classified.length,
    summary,
    rules: opts.rules ? path.basename(opts.rules) : 'rules.example.json(默认示例)',
    items: classified,
  };

  if (opts.out) {
    fs.writeFileSync(path.resolve(opts.out), JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ ok: true, count: classified.length, summary, written: opts.out }, null, 2));
  } else {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  }
}

async function fetchMails(opts) {
  const mailbox = opts.mailbox || process.env.EMAIL_MAILBOX || 'INBOX';
  const limit = parseInt(opts.limit, 10) || 20;
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
        // 正文做摘要,既保留信息又控制体积
        norm.text = snippet(norm.text, 500);
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
  console.log(`simple-email · 案例2:规则分类 + 字段提取

用法:
  node examples/classifier/classify.js [--limit 20] [--unread] [--mailbox X]
                                       [--rules rules.json] [--out result.json]
                                       [--since-days 7]

  离线测试:
  node examples/classifier/classify.js --dry-run --in fixture.json

这是「核心 skill 如何延展」的示范:复用 scripts/lib 的收信能力,
加上 examples/classifier/engine.js 的纯规则引擎做分类与字段提取。
自定义分类见 docs/extend-guide.md。`);
}

main().catch((e) => {
  console.error('错误:' + (e.message || e));
  process.exit(1);
});
