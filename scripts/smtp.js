'use strict';

// SMTP 核心 CLI:发邮件(纯文本/HTML/附件)
// 用法:
//   node scripts/smtp.js send --to a@b.com --subject "标题" [--text "..."] [--html "..."] [--attach file1 file2] [--cc ...] [--bcc ...]
//   node scripts/smtp.js verify                  # 校验 SMTP 连通性

const { createSmtp, loadEnv } = require('./lib/client');
const path = require('path');

function parseArgs(argv) {
  const args = argv.slice(2);
  const cmd = args[0];
  const rest = args.slice(1);
  const opts = { _: [], attach: [] };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (key === 'attach') {
        const next = rest[i + 1];
        if (next && !next.startsWith('--')) {
          opts.attach.push(next);
          i++;
        }
        continue;
      }
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
    case 'send':
      return cmdSend(opts);
    case 'verify':
      return cmdVerify();
    default:
      console.error(`未知命令:${cmd}`);
      help();
      process.exit(2);
  }
}

async function cmdSend(opts) {
  const to = (opts.to || '').trim();
  if (!to) {
    console.error('用法:send --to <邮箱> --subject <标题> [--text|--html <内容>]');
    process.exit(2);
  }
  if (!opts.text && !opts.html) {
    console.error('需要 --text 或 --html 提供正文');
    process.exit(2);
  }

  const { transporter, config } = createSmtp();
  const from = config.fromName ? `"${config.fromName}" <${config.user}>` : config.user;
  const mail = {
    from,
    to,
    cc: opts.cc,
    bcc: opts.bcc,
    subject: opts.subject || '(无主题)',
    text: opts.text,
    html: opts.html,
  };
  if (opts.attach && opts.attach.length) {
    mail.attachments = opts.attach.map((f) => {
      const fs = require('fs');
      if (!fs.existsSync(f)) throw new Error(`附件不存在:${f}`);
      return { filename: path.basename(f), path: path.resolve(f) };
    });
  }
  const info = await transporter.sendMail(mail);
  console.log(JSON.stringify({
    ok: true,
    messageId: info.messageId,
    response: info.response,
    to, from,
  }, null, 2));
}

async function cmdVerify() {
  const { transporter, config } = createSmtp();
  const ok = await transporter.verify();
  console.log(JSON.stringify({
    ok,
    smtp: config.smtp,
    user: config.user,
  }, null, 2));
}

function help() {
  console.log(`simple-email · SMTP 核心 CLI

用法:
  node scripts/smtp.js send --to a@b.com --subject "标题" [--text "..."] [--html "..."]
                             [--attach f1 f2] [--cc ...] [--bcc ...]
  node scripts/smtp.js verify

环境变量(见 .env.example):
  EMAIL_USER / EMAIL_PASS / EMAIL_PRESET / EMAIL_FROM_NAME ...`);
}

main().catch((e) => {
  console.error('错误:' + (e.message || e));
  process.exit(1);
});
