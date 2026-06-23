'use strict';

// 诊断 CLI:自检配置、DNS、IMAP 连通、SMTP 连通。
// 使用者第一次配好后跑一遍,快速定位问题。

const { loadEnv, getConfig, openImap, createSmtp } = require('./lib/client');

async function main() {
  loadEnv();
  const steps = [];
  let cfg;
  try {
    cfg = getConfig();
    steps.push({ name: '配置加载', status: 'ok', detail: `user=${cfg.user} preset=${cfg.preset || 'custom'} (${cfg.presetLabel})` });
  } catch (e) {
    steps.push({ name: '配置加载', status: 'fail', detail: e.message });
    print(steps);
    process.exit(1);
  }

  // IMAP
  try {
    const t0 = Date.now();
    const client = await openImap();
    const ms = Date.now() - t0;
    let mb;
    try { mb = await client.list(); } catch { mb = []; }
    await client.logout();
    steps.push({ name: 'IMAP 连接', status: 'ok', detail: `${cfg.imap.host}:${cfg.imap.port} (${ms}ms), 信箱数 ${mb.length}` });
  } catch (e) {
    steps.push({ name: 'IMAP 连接', status: 'fail', detail: `${cfg.imap.host}:${cfg.imap.port} → ${e.message}` });
  }

  // SMTP
  try {
    const t0 = Date.now();
    const { transporter } = createSmtp();
    await transporter.verify();
    const ms = Date.now() - t0;
    steps.push({ name: 'SMTP 连接', status: 'ok', detail: `${cfg.smtp.host}:${cfg.smtp.port} (${ms}ms)` });
  } catch (e) {
    steps.push({ name: 'SMTP 连接', status: 'fail', detail: `${cfg.smtp.host}:${cfg.smtp.port} → ${e.message}` });
  }

  print(steps);
  const allOk = steps.every((s) => s.status === 'ok');
  process.exit(allOk ? 0 : 1);
}

function print(steps) {
  const ok = steps.filter((s) => s.status === 'ok').length;
  console.log(JSON.stringify({ ok: ok === steps.length, pass: ok, total: steps.length, steps }, null, 2));
}

main().catch((e) => {
  console.error('诊断异常:' + (e.message || e));
  process.exit(1);
});
