'use strict';

// 配置加载与预设匹配。
// 纯逻辑、无网络,完全可单测。

const PRESETS = {
  foxmail: {
    label: 'Foxmail / QQ 邮箱',
    imap: { host: 'imap.qq.com', port: 993 },
    smtp: { host: 'smtp.qq.com', port: 465 },
    note: 'foxmail.com 本质是腾讯 QQ 邮箱,走 imap/smtp.qq.com,使用授权码。',
  },
  qq: {
    label: 'QQ 邮箱',
    imap: { host: 'imap.qq.com', port: 993 },
    smtp: { host: 'smtp.qq.com', port: 465 },
  },
  163: {
    label: '网易 163 邮箱',
    imap: { host: 'imap.163.com', port: 993 },
    smtp: { host: 'smtp.163.com', port: 465 },
  },
  126: {
    label: '网易 126 邮箱',
    imap: { host: 'imap.126.com', port: 993 },
    smtp: { host: 'smtp.126.com', port: 465 },
  },
  gmail: {
    label: 'Gmail',
    imap: { host: 'imap.gmail.com', port: 993 },
    smtp: { host: 'smtp.gmail.com', port: 465 },
    note: '需开启两步验证 + 应用专用密码。',
  },
  outlook: {
    label: 'Outlook / Hotmail / Live',
    imap: { host: 'outlook.office365.com', port: 993 },
    smtp: { host: 'smtp.office365.com', port: 587 },
  },
  sina: {
    label: '新浪邮箱',
    imap: { host: 'imap.sina.com', port: 993 },
    smtp: { host: 'smtp.sina.com', port: 465 },
  },
};

// 后缀 -> preset 的自动匹配
const SUFFIX_MAP = {
  '@foxmail.com': 'foxmail',
  '@qq.com': 'qq',
  '@163.com': '163',
  '@126.com': '126',
  '@gmail.com': 'gmail',
  '@outlook.com': 'outlook',
  '@hotmail.com': 'outlook',
  '@live.com': 'outlook',
  '@sina.com': 'sina',
  '@sina.cn': 'sina',
};

/**
 * 按邮箱地址后缀推断 preset。
 * @param {string} user 完整邮箱地址
 * @returns {string|null}
 */
function detectPreset(user) {
  if (!user || typeof user !== 'string') return null;
  const lower = user.toLowerCase();
  for (const [suffix, preset] of Object.entries(SUFFIX_MAP)) {
    if (lower.endsWith(suffix)) return preset;
  }
  return null;
}

/**
 * 从环境变量构造完整配置对象。
 * @param {object} env 进程环境,默认 process.env(便于注入测试)
 * @returns {object} 配置对象
 */
function loadConfig(env = process.env) {
  const user = (env.EMAIL_USER || '').trim();
  const pass = env.EMAIL_PASS || '';
  const presetKey = (env.EMAIL_PRESET || '').trim().toLowerCase() || null;
  const mailbox = (env.EMAIL_MAILBOX || 'INBOX').trim();

  if (!user) {
    throw new ConfigError('缺少 EMAIL_USER,请复制 .env.example 为 .env 并填写。');
  }
  if (!pass) {
    throw new ConfigError('缺少 EMAIL_PASS(授权码,非登录密码)。');
  }

  const preset = presetKey || detectPreset(user);
  if (!preset && !env.IMAP_HOST) {
    throw new ConfigError(
      `无法识别 "${user}" 的服务商。请设置 EMAIL_PRESET=custom 并填写 IMAP_HOST/SMTP_HOST。`
    );
  }
  if (preset && preset !== 'custom' && !PRESETS[preset]) {
    throw new ConfigError(`未知 EMAIL_PRESET="${presetKey}"。可选:${[...Object.keys(PRESETS), 'custom'].join(', ')}。`);
  }

  const base = {
    user,
    pass,
    mailbox,
    timeout: parseInt(env.EMAIL_TIMEOUT, 10) || 30000,
    fromName: (env.EMAIL_FROM_NAME || '').trim(),
    preset,
  };

  if (preset && preset !== 'custom') {
    const p = PRESETS[preset];
    return {
      ...base,
      imap: { ...p.imap },
      smtp: { ...p.smtp },
      presetLabel: p.label,
      note: p.note || '',
    };
  }

  // custom
  return {
    ...base,
    imap: {
      host: env.IMAP_HOST,
      port: parseInt(env.IMAP_PORT, 10) || 993,
    },
    smtp: {
      host: env.SMTP_HOST,
      port: parseInt(env.SMTP_PORT, 10) || 465,
    },
    presetLabel: '自定义',
    note: '',
  };
}

class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

module.exports = { PRESETS, SUFFIX_MAP, detectPreset, loadConfig, ConfigError };
