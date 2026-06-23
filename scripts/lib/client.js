'use strict';

// IMAP / SMTP 连接工厂。
// 集中处理:TLS 配置、统一错误包装、连接日志。
// 把「如何连」从「做什么」里隔离出来,核心 CLI 只调用本文件。

const { ImapFlow } = require('imapflow');
const nodemailer = require('nodemailer');
const path = require('path');

// 加载 .env(用户本地)。dotenv 不是核心依赖,用最小自实现避免新增依赖。
function loadEnv() {
  const fs = require('fs');
  for (const candidate of [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '..', '..', '.env'),
  ]) {
    if (fs.existsSync(candidate)) {
      const lines = fs.readFileSync(candidate, 'utf8').split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq < 0) continue;
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (process.env[key] === undefined) process.env[key] = val;
      }
      break;
    }
  }
}

const { loadConfig } = require('./config');

function getConfig() {
  loadEnv();
  return loadConfig();
}

/**
 * 创建并打开一个 IMAP 连接。调用方负责 client.logout()。
 * @param {object} [opts]
 * @param {boolean} [opts.logger=false] 是否打印连接日志
 * @returns {Promise<import('imapflow').ImapFlow>}
 */
async function openImap(opts = {}) {
  const cfg = getConfig();
  const client = new ImapFlow({
    host: cfg.imap.host,
    port: cfg.imap.port,
    secure: cfg.imap.port === 993,
    auth: { user: cfg.user, pass: cfg.pass },
    socketTimeout: cfg.timeout,
    logger: opts.logger ? imapLogger() : false,
  });
  await client.connect();
  return client;
}

/**
 * 创建一个 SMTP transporter(nodemailer 惰性连接,sendMail 时才连)。
 * @returns {{transporter: object, config: object}}
 */
function createSmtp() {
  const cfg = getConfig();
  const transporter = nodemailer.createTransport({
    host: cfg.smtp.host,
    port: cfg.smtp.port,
    secure: cfg.smtp.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
    connectionTimeout: cfg.timeout,
    greetingTimeout: cfg.timeout,
    socketTimeout: cfg.timeout,
  });
  return { transporter, config: cfg };
}

function imapLogger() {
  return {
    debug: (m) => process.stderr.write(`[imap:debug] ${m.msg || m}\n`),
    info: (m) => process.stderr.write(`[imap] ${m.msg || m}\n`),
    warn: (m) => process.stderr.write(`[imap:warn] ${m.msg || m}\n`),
    error: (m) => process.stderr.write(`[imap:error] ${m.msg || m}\n`),
  };
}

module.exports = { loadEnv, getConfig, openImap, createSmtp };
