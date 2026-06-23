'use strict';

// 分类引擎:纯逻辑,无网络、无 IO。
// 输入:标准化邮件对象(见 scripts/lib/format.js 的 normalize 输出) + 规则集
// 输出:分类结果 + 提取字段
// 设计为「规则优先级 + 命中即止」,可预测、可单测、零依赖。

/**
 * 规则集结构:
 * [
 *   {
 *     name: "发票",
 *     match: {
 *       fromContains: ["发票", "invoice", "@kingdee"],     // 任一包含(不区分大小写)
 *       subjectContains: ["发票", "电子发票", "对账"],
 *       subjectRegex: "^\\[.*?发票.*?\\]"                  // 可选,正则
 *     },
 *     extract: {                                            // 可选字段提取
 *       amount: { pattern: "金额[:：]\\s*([0-9.,]+元)", group: 1 },
 *       invoiceNo: { pattern: "发票号码[:：]\\s*([A-Z0-9]+)", group: 1 }
 *     }
 *   }
 * ]
 * 无任何规则命中时,分类为 defaultCategory(默认 "其他")。
 */

const DEFAULT_CATEGORY = '其他';

/**
 * 用规则集对单封邮件分类并提取字段。
 * @param {object} mail normalize() 产出的标准邮件
 * @param {Array} rules 规则数组
 * @param {object} [opts] { defaultCategory }
 * @returns {{category:string, matchedRule:string|null, extracted:object, allMatches:string[]}}
 */
function classify(mail, rules, opts = {}) {
  const defaultCategory = opts.defaultCategory || DEFAULT_CATEGORY;
  const allMatches = [];
  let matched = null;

  for (const rule of rules) {
    if (matches(mail, rule)) {
      allMatches.push(rule.name);
      if (!matched) matched = rule; // 第一个命中为准,后续只记录
    }
  }

  const category = matched ? matched.name : defaultCategory;
  const extracted = matched ? extractFields(mail, matched.extract || {}) : {};

  return { category, matchedRule: matched ? matched.name : null, extracted, allMatches };
}

function matches(mail, rule) {
  const m = rule.match || {};
  const from = (mail.from && (mail.from.address + ' ' + mail.from.name)) || '';
  const subject = mail.subject || '';
  const text = mail.text || '';

  if (m.fromContains && m.fromContains.length) {
    if (!anyContains(from, m.fromContains)) return false;
  }
  if (m.subjectContains && m.subjectContains.length) {
    if (!anyContains(subject, m.subjectContains)) return false;
  }
  if (m.subjectRegex) {
    try {
      const re = new RegExp(m.subjectRegex);
      if (!re.test(subject)) return false;
    } catch {
      return false; // 坏正则不算命中,避免误伤
    }
  }
  if (m.bodyContains && m.bodyContains.length) {
    if (!anyContains(text, m.bodyContains)) return false;
  }
  return true;
}

function anyContains(haystack, needles) {
  const h = String(haystack).toLowerCase();
  return needles.some((n) => h.includes(String(n).toLowerCase()));
}

/**
 * 按规则提取字段。先正文后主题。
 * @returns {object} { field: value }
 */
function extractFields(mail, extractDef) {
  const out = {};
  const sources = [mail.text || '', mail.subject || ''].join('\n');
  for (const [field, spec] of Object.entries(extractDef || {})) {
    const pattern = spec.pattern;
    const group = spec.group || 1;
    try {
      const re = new RegExp(pattern, spec.flags || '');
      const m = sources.match(re);
      if (m && m[group] != null) {
        out[field] = m[group].trim();
      }
    } catch {
      // 坏正则跳过
    }
  }
  return out;
}

/**
 * 批量分类。
 * @param {Array<object>} mails
 * @param {Array} rules
 * @param {object} [opts]
 * @returns {Array<object>} 每封 { ...mail 原有字段, category, matchedRule, extracted }
 */
function classifyAll(mails, rules, opts) {
  return mails.map((mail) => {
    const r = classify(mail, rules, opts);
    return { ...mail, ...r };
  });
}

module.exports = { classify, classifyAll, matches, extractFields, DEFAULT_CATEGORY };
