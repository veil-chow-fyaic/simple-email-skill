'use strict';

// IMAP 核心 CLI:列出/读取/搜索/标记/附件下载
// 用法:
//   node scripts/imap.js list [--mailbox X] [--limit N] [--unread] [--format json|text]
//   node scripts/imap.js read <uid> [--mailbox X] [--no-body] [--format json|text]
//   node scripts/imap.js search <query> [--mailbox X] [--limit N] [--format json|text]
//   node scripts/imap.js mark <uid> [--read|--unread] [--mailbox X]
//   node scripts/imap.js attach <uid> [--mailbox X] [--dir ./downloads]
//   node scripts/imap.js mailbox [--format json]

const { openImap } = require('./lib/client');
const { normalize, printResult, snippet } = require('./lib/format');
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = argv.slice(2);
  const cmd = args[0];
  const rest = args.slice(1);
  const opts = { _: [] };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = rest[i + 1];
      if (next != null && !next.startsWith('--')) {
        opts[key] = next;
        i++;
      } else {
        opts[key] = true;
      }
    } else {
      opts._.push(a);
    }
  }
  return { cmd, opts };
}

async function main() {
  const { cmd, opts } = parseArgs(process.argv);
  if (!cmd || cmd === 'help' || opts.help) return help();

  switch (cmd) {
    case 'list':
      return cmdList(opts);
    case 'read':
      return cmdRead(opts);
    case 'search':
      return cmdSearch(opts);
    case 'mark':
      return cmdMark(opts);
    case 'attach':
      return cmdAttach(opts);
    case 'mailbox':
      return cmdMailbox(opts);
    default:
      console.error(`未知命令:${cmd}`);
      help();
      process.exit(2);
  }
}

async function withClient(mailbox, fn) {
  const client = await openImap();
  let lock;
  try {
    if (mailbox) {
      lock = await client.getMailboxLock(mailbox);
    }
    return await fn(client);
  } finally {
    if (lock) lock.release();
    await client.logout();
  }
}

async function cmdList(opts) {
  const mailbox = opts.mailbox || process.env.EMAIL_MAILBOX || 'INBOX';
  const limit = parseInt(opts.limit, 10) || 20;
  const format = opts.format || 'json';
  const onlyUnread = !!opts.unread;

  const result = await withClient(mailbox, async (client) => {
    const search = onlyUnread ? { seen: false } : { all: true };
    const uids = await client.search(search);
    const last = uids.slice(-limit).reverse();
    if (!last.length) return [];
    const msgs = [];
    for await (const m of client.fetch(last, { envelope: true, source: true, flags: true, internalDate: true }, { uid: true })) {
      const norm = await normalize(m, { includeBody: false });
      // 列表场景给个摘要更实用
      norm.snippet = '';
      const withText = await client.fetchOne(m.uid, { source: true }, { uid: true });
      if (withText) {
        const full = await normalize(withText, { includeBody: true });
        norm.snippet = snippet(full.text, 100);
      }
      msgs.push(norm);
    }
    return msgs;
  });
  printResult(result, { format });
}

async function cmdRead(opts) {
  const uid = parseInt(opts._[0], 10);
  if (!uid) {
    console.error('用法:read <uid>');
    process.exit(2);
  }
  const mailbox = opts.mailbox || process.env.EMAIL_MAILBOX || 'INBOX';
  const includeBody = !opts['no-body'];
  const format = opts.format || 'json';

  const result = await withClient(mailbox, async (client) => {
    const m = await client.fetchOne(uid, { source: true, flags: true, envelope: true }, { uid: true });
    if (!m) throw new Error(`未找到 UID=${uid} 的邮件`);
    return normalize(m, { includeBody, includeHeaders: !!opts.headers });
  });
  printResult(result, { format });
}

async function cmdSearch(opts) {
  const query = opts._.join(' ');
  if (!query) {
    console.error('用法:search <关键词>');
    process.exit(2);
  }
  const mailbox = opts.mailbox || process.env.EMAIL_MAILBOX || 'INBOX';
  const limit = parseInt(opts.limit, 10) || 20;
  const format = opts.format || 'json';

  const result = await withClient(mailbox, async (client) => {
    const uids = await client.search({ body: query });
    const last = uids.slice(-limit).reverse();
    if (!last.length) return [];
    const out = [];
    for await (const m of client.fetch(last, { envelope: true, source: true, flags: true }, { uid: true })) {
      const norm = await normalize(m, { includeBody: false });
      out.push(norm);
    }
    return out;
  });
  printResult(result, { format });
}

async function cmdMark(opts) {
  const uid = parseInt(opts._[0], 10);
  if (!uid) {
    console.error('用法:mark <uid> [--read|--unread]');
    process.exit(2);
  }
  const mailbox = opts.mailbox || process.env.EMAIL_MAILBOX || 'INBOX';
  if (!opts.read && !opts.unread) {
    console.error('请指定 --read 或 --unread');
    process.exit(2);
  }
  await withClient(mailbox, async (client) => {
    if (opts.read) await client.flagsAdd(uid, ['\\Seen'], { uid: true });
    if (opts.unread) await client.flagsRemove(uid, ['\\Seen'], { uid: true });
  });
  printResult({ ok: true, uid, action: opts.read ? 'read' : 'unread', mailbox });
}

async function cmdAttach(opts) {
  const uid = parseInt(opts._[0], 10);
  if (!uid) {
    console.error('用法:attach <uid> [--dir ./downloads]');
    process.exit(2);
  }
  const mailbox = opts.mailbox || process.env.EMAIL_MAILBOX || 'INBOX';
  const dir = path.resolve(opts.dir || './downloads');
  fs.mkdirSync(dir, { recursive: true });

  const saved = await withClient(mailbox, async (client) => {
    const m = await client.fetchOne(uid, { source: true }, { uid: true });
    if (!m) throw new Error(`未找到 UID=${uid} 的邮件`);
    const { simpleParser } = require('mailparser');
    const parsed = await simpleParser(m.source);
    const files = [];
    for (const a of parsed.attachments || []) {
      const safe = (a.filename || `attachment-${Date.now()}`).replace(/[\\/]/g, '_');
      const full = path.join(dir, safe);
      fs.writeFileSync(full, a.content);
      files.push({ filename: safe, path: full, size: a.size, contentType: a.contentType });
    }
    return files;
  });
  printResult({ ok: true, uid, dir, saved: saved });
}

async function cmdMailbox(opts) {
  const format = opts.format || 'json';
  const client = await openImap();
  try {
    const list = await client.list();
    const out = list.map((m) => ({ path: m.path, flags: m.flags, specialUse: m.specialUse || '' }));
    printResult(out, { format });
  } finally {
    await client.logout();
  }
}

function help() {
  console.log(`simple-email · IMAP 核心 CLI

用法:
  node scripts/imap.js list [--mailbox X] [--limit N] [--unread] [--format json|text]
  node scripts/imap.js read <uid> [--mailbox X] [--no-body] [--format json|text]
  node scripts/imap.js search <关键词> [--mailbox X] [--limit N] [--format json|text]
  node scripts/imap.js mark <uid> --read|--unread [--mailbox X]
  node scripts/imap.js attach <uid> [--mailbox X] [--dir ./downloads]
  node scripts/imap.js mailbox [--format json]

环境变量(见 .env.example):
  EMAIL_USER / EMAIL_PASS / EMAIL_PRESET / EMAIL_MAILBOX ...`);
}

main().catch((e) => {
  console.error('错误:' + (e.message || e));
  process.exit(1);
});
