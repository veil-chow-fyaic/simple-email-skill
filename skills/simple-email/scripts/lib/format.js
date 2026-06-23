'use strict';

// 邮件对象标准化与输出格式化。
// 纯逻辑、无网络、无副作用(除了 console),完全可单测。

const { simpleParser } = require('mailparser');

/**
 * 把 ImapFlow 的 message 对象解析为标准结构。
 * @param {object} msg ImapFlow fetchOne/fetch 返回项,含 envelope/bodyParts 或 source
 * @param {object} [opts]
 * @param {boolean} [opts.includeBody=true] 是否抓取正文
 * @param {boolean} [opts.includeHeaders=false] 是否保留原始头
 * @returns {Promise<object>} 标准化邮件对象
 */
async function normalize(msg, opts = {}) {
  const { includeBody = true, includeHeaders = false } = opts;

  let parsed = null;
  if (msg.source) {
    parsed = await simpleParser(msg.source);
  }

  const env = parsed || {};
  const from = parsed ? addressToOne(parsed.from) : null;
  const to = parsed ? addresses(parsed.to) : [];
  const subject = parsed ? decode(parsed.subject) : (msg.envelope && msg.envelope.subject) || '';
  const date = parsed && parsed.date ? parsed.date : (msg.envelope && msg.envelope.date) || null;
  const uid = msg.uid != null ? msg.uid : (parsed && parsed.headers && parsed.headers.get('x-uid')) || null;
  const messageId = parsed ? parsed.messageId : (msg.envelope && msg.envelope.messageId) || null;

  const out = {
    uid,
    messageId,
    subject,
    from,
    to,
    date: date ? new Date(date).toISOString() : null,
    flags: Array.isArray(msg.flags) ? msg.flags.map(String) : [],
  };

  if (includeBody && parsed) {
    out.text = parsed.text || '';
    out.html = parsed.html || '';
    out.attachments = (parsed.attachments || []).map((a) => ({
      filename: a.filename,
      contentType: a.contentType,
      size: a.size,
    }));
  }
  if (includeHeaders && parsed && parsed.headers) {
    out.headers = {};
    for (const [k, v] of parsed.headers) {
      out.headers[k] = v;
    }
  }
  return out;
}

function addresses(addr) {
  if (!addr) return [];
  const arr = Array.isArray(addr) ? addr : addr.value || [addr];
  return arr.map((a) => ({
    name: a.name ? decode(a.name) : '',
    address: a.address || '',
  }));
}

function addressToOne(addr) {
  const list = addresses(addr);
  return list[0] || { name: '', address: '' };
}

// 简单 MIME 编码字解码。复杂场景由 mailparser 处理,这里兜底。
function decode(s) {
  if (s == null) return '';
  if (typeof s !== 'string') return String(s);
  return s;
}

/**
 * 打印结构化结果。默认 JSON,便于 agent 解析。
 * @param {*} data
 * @param {object} [opts] {format:'json'|'text', fields:[...]}
 */
function printResult(data, opts = {}) {
  const { format = 'json' } = opts;
  if (format === 'text') {
    printText(data);
  } else {
    process.stdout.write(JSON.stringify(data, null, 2) + '\n');
  }
}

function printText(data) {
  const items = Array.isArray(data) ? data : [data];
  if (!items.length) {
    console.log('(无结果)');
    return;
  }
  for (const m of items) {
    const date = m.date ? m.date.replace('T', ' ').replace(/\..*$/, '') : '';
    const from = m.from ? `${m.from.name || ''}<${m.from.address}>` : '';
    const flags = (m.flags || []).join(',');
    console.log(`UID ${m.uid ?? '-'} | ${date} | ${from} | 主题:${m.subject || '(无主题)'} | [${flags}]`);
    if (m.snippet) console.log(`    ${m.snippet}`);
  }
}

// 截取正文摘要(清洗 HTML/URL 噪音)
function snippet(text, max = 80) {
  if (!text) return '';
  let s = String(text);
  // 去除残留的 HTML 标签和图片/链接 URL
  s = s.replace(/<[^>]+>/g, ' ');
  s = s.replace(/https?:\/\/\S+/g, '');
  s = s.replace(/\[[^\]]*\]\(\s*\)/g, ' '); // 空 markdown 链接残留
  // 压缩空白
  s = s.replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max) + '…' : s;
}

module.exports = { normalize, addresses, addressToOne, printResult, snippet };
