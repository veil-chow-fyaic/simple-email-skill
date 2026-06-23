'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { detectPreset, loadConfig, ConfigError } = require('../scripts/lib/config');

test('detectPreset 识别常见服务商后缀', () => {
  assert.equal(detectPreset('feng.463728559@foxmail.com'), 'foxmail');
  assert.equal(detectPreset('test@qq.com'), 'qq');
  assert.equal(detectPreset('a@163.com'), '163');
  assert.equal(detectPreset('b@126.com'), '126');
  assert.equal(detectPreset('c@gmail.com'), 'gmail');
  assert.equal(detectPreset('d@outlook.com'), 'outlook');
  assert.equal(detectPreset('e@hotmail.com'), 'outlook');
  assert.equal(detectPreset('f@sina.com'), 'sina');
});

test('detectPreset 大小写不敏感', () => {
  assert.equal(detectPreset('TEST@QQ.COM'), 'qq');
  assert.equal(detectPreset('A@Gmail.Com'), 'gmail');
});

test('detectPreset 未知后缀返回 null', () => {
  assert.equal(detectPreset('x@unknown.com'), null);
  assert.equal(detectPreset(''), null);
  assert.equal(detectPreset(null), null);
  assert.equal(detectPreset(undefined), null);
});

test('loadConfig 缺 EMAIL_USER 抛 ConfigError', () => {
  assert.throws(() => loadConfig({}), ConfigError);
  assert.throws(() => loadConfig({ EMAIL_USER: '' }), ConfigError);
});

test('loadConfig 缺 EMAIL_PASS 抛 ConfigError', () => {
  assert.throws(() => loadConfig({ EMAIL_USER: 'a@b.com' }), ConfigError);
});

test('loadConfig foxmail 走 QQ 服务器', () => {
  const cfg = loadConfig({ EMAIL_USER: 'feng.463728559@foxmail.com', EMAIL_PASS: 'code' });
  assert.equal(cfg.preset, 'foxmail');
  assert.equal(cfg.imap.host, 'imap.qq.com');
  assert.equal(cfg.imap.port, 993);
  assert.equal(cfg.smtp.host, 'smtp.qq.com');
  assert.equal(cfg.smtp.port, 465);
});

test('loadConfig 显式 preset 覆盖自动检测', () => {
  const cfg = loadConfig({ EMAIL_USER: 'a@b.com', EMAIL_PASS: 'c', EMAIL_PRESET: 'gmail' });
  assert.equal(cfg.preset, 'gmail');
  assert.equal(cfg.imap.host, 'imap.gmail.com');
});

test('loadConfig 未知 preset 抛错', () => {
  assert.throws(
    () => loadConfig({ EMAIL_USER: 'a@b.com', EMAIL_PASS: 'c', EMAIL_PRESET: 'zzz' }),
    ConfigError
  );
});

test('loadConfig custom 需要 IMAP_HOST', () => {
  assert.throws(
    () => loadConfig({ EMAIL_USER: 'a@unknown.com', EMAIL_PASS: 'c' }),
    /无法识别/
  );
  const cfg = loadConfig({
    EMAIL_USER: 'a@unknown.com', EMAIL_PASS: 'c',
    EMAIL_PRESET: 'custom', IMAP_HOST: 'mail.example.com', SMTP_HOST: 'mail.example.com',
  });
  assert.equal(cfg.imap.host, 'mail.example.com');
  assert.equal(cfg.smtp.host, 'mail.example.com');
});

test('loadConfig 默认值合理', () => {
  const cfg = loadConfig({ EMAIL_USER: 'a@qq.com', EMAIL_PASS: 'c' });
  assert.equal(cfg.mailbox, 'INBOX');
  assert.equal(cfg.timeout, 30000);
  assert.equal(cfg.preset, 'qq');
});
