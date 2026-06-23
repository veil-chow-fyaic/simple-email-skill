# 扩展指南(授人以渔)

本仓库的核心理念:**通用收发能力(核心)与业务处理(下游)物理隔离**。核心 `scripts/` 永远干净,业务逻辑放在可剥离的 `examples/` 里。本文教你怎么把邮件能力接到你自己的下游——分类、提取、写表、接入 LLM、定时任务等。

## TL;DR

想做邮件分类/写表,**不用改代码,改规则就行**:

```bash
# 1. 复制规则文件,改成你自己的(参考真实邮箱范例)
cp examples/classifier/rules.realbox.example.json rules.json
# 编辑 rules.json:改 fromContains/subjectContains/extract

# 2. 一条命令跑出表格
node examples/workflow/pipeline.js --rules rules.json --out ./output/report.xlsx --since-days 30
```

规则 = 「发件人/主题关键词」匹配 + 「正则提取字段」。看 `examples/classifier/rules.realbox.example.json` 里的真实例子(订单号、退款金额、会员有效期都怎么提的),5 分钟就会。

**三种扩展方式(按需选)**:
- 改规则(最快) → 下文「二」
- 用代码调核心库(最灵活) → 下文「三」
- 接 LLM 做语义分类(最智能) → 下文「四」

## 一、核心层只给你一件事:标准化的邮件对象

所有核心收信命令的输出,都是**同一个结构**的 JSON 对象(见 `scripts/lib/format.js` 的 `normalize`):

```json
{
  "uid": 1001,
  "messageId": "<...>",
  "subject": "主题",
  "from": { "name": "发件人名", "address": "a@b.com" },
  "to": [{ "name": "", "address": "c@d.com" }],
  "date": "2026-06-20T10:30:00.000Z",
  "flags": ["\\Seen"],
  "text": "纯文本正文",
  "html": "<html>正文</html>",
  "attachments": [{ "filename": "f.pdf", "contentType": "application/pdf", "size": 12345 }]
}
```

**你要做的下游处理,本质上就是消费这个对象。** 不用关心 IMAP 协议细节。

## 二、最小下游:自己写一个分类器

复制 `examples/classifier/`,改 `rules.json` 即可。规则结构:

```json
{
  "defaultCategory": "其他",
  "rules": [
    {
      "name": "你的分类名",
      "match": {
        "fromContains": ["关键词1", "@某域名"],     // 发件人含任一(大小写不敏感)
        "subjectContains": ["主题词"],               // 主题含任一
        "subjectRegex": "^\\[.*\\]",                 // 可选,主题正则
        "bodyContains": ["正文词"]                   // 可选,正文含任一
      },
      "extract": {
        "字段名": { "pattern": "正则(带捕获组)", "group": 1 }
      }
    }
  ]
}
```

多条件之间是**「且」**;同一 `*Contains` 数组内是**「或」**。第一个命中的规则为准。

运行:`node examples/classifier/classify.js --rules rules.json --limit 50`

引擎是纯函数(`examples/classifier/engine.js`),可单测,零网络依赖。

## 三、用代码直接调(不通过 CLI)

如果你在写自己的程序,直接 require 核心库:

```js
const { openImap } = require('./scripts/lib/client');
const { normalize } = require('./scripts/lib/format');

(async () => {
  const client = await openImap();
  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const uids = await client.search({ seen: false }); // 未读
      for await (const m of client.fetch(uids, { source: true, flags: true }, { uid: true })) {
        const mail = await normalize(m); // ← 你拿到的就是这个标准对象
        console.log(mail.subject, mail.from.address);
        // ↓ 这里写你的处理逻辑:写库、调 LLM、发通知……
      }
    } finally { lock.release(); }
  } finally { await client.logout(); }
})();
```

## 四、接 LLM 做语义分类(进阶)

规则版零依赖、可预测。若需要语义理解(如「这封邮件属于哪个业务线」「提取合同条款」),替换 `examples/classifier/engine.js` 的 `classify` 函数:

```js
// 伪代码:把规则匹配换成 LLM 调用
async function classifyWithLLM(mail) {
  const prompt = `分类以下邮件,输出 JSON {category, fields}。\n主题:${mail.subject}\n正文:${mail.text}`;
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.LLM_KEY}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }] }),
  });
  return (await resp.json()).choices[0].message.content; // 解析为对象
}
```

建议:规则版做粗筛(LLM 只处理「其他」),兼顾成本与准确率。

## 五、自定义输出 sink

`examples/workflow/sinks/` 目前有 `csv.js` 和 `xlsx.js`。要写别的地方(数据库、飞书表格、Webhook),实现一个同样签名的函数:

```js
// my-sink.js
async function writeMy(items, target) {
  for (const it of items) {
    // it 已含 category, matchedRule, extracted
    await db.insert('emails', { uid: it.uid, category: it.category, ...it.extracted });
  }
  return { target, rows: items.length };
}
module.exports = { writeMy };
```

然后在 `pipeline.js` 的写表环节替换 `writeCsv`/`writeXlsx` 即可。

## 六、定时跑(做成 cron)

```bash
# 每天 9 点拉取前一天未读,分类后写 xlsx
0 9 * * * cd /path/simple-email && node examples/workflow/pipeline.js --since-days 1 --unread --out /var/mail-reports/$(date +\%F).xlsx
```

## 七、牢记的边界

| 层 | 目录 | 你可以做什么 |
|---|---|---|
| 核心 | `scripts/` | **只读不改**。它对所有 agent 通用,改了会影响所有人 |
| 案例 | `examples/` | **随便复制、随便改**。这是给你参考的,删了也不影响核心 |
| 你的业务 | 新目录 | 在核心之上构建,引用 `scripts/lib/` 的稳定接口 |

核心稳定、业务可变——这就是分层的好处。
