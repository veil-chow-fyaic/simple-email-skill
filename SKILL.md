---
name: simple-email
description: 通用 IMAP/SMTP 邮件技能。任意 agent 加载即可收发邮件、搜索、标记、下载附件、自动分类导出表格。兼容 Foxmail/QQ/163/126/Gmail/Outlook/新浪等所有标准服务。输出结构化 JSON。Node.js。
---

# Simple Email Skill

通用 email skill。你(agent)可以用它收发邮件,所有命令输出**结构化 JSON**,直接解析。

## ⚡ 速查:用户想做什么 → 跑哪条命令

| 用户意图 | 命令 |
|---|---|
| "看我的未读邮件" | `node scripts/imap.js list --unread --limit 10 --format text` |
| "读第 N 封" | `node scripts/imap.js read <uid>` |
| "搜含 XX 的邮件" | `node scripts/imap.js search "XX"` |
| "标记这封已读" | `node scripts/imap.js mark <uid> --read` |
| "下载这封的附件" | `node scripts/imap.js attach <uid>` |
| "发邮件给 X" | `node scripts/smtp.js send --to X --subject 标题 --text 内容` |
| "把邮件分类整理成表格" | `node examples/workflow/pipeline.js --out ./output/report.xlsx` |
| "检查配置对不对" | `node scripts/doctor.js` |

## 📋 输出契约(每封邮件都是这个结构)

```jsonc
{
  "uid": 1793,                              // 唯一 ID,后续 read/mark/attach 用它
  "subject": "极速退款成功",
  "from": { "name": "淘宝网", "address": "taobao@news.mail.taobao.com" },
  "to": [{ "name": "", "address": "..." }],
  "date": "2023-07-08T02:04:01.000Z",
  "flags": ["\\Seen"],                       // \Seen=已读
  "text": "纯文本正文",
  "html": "<html>正文</html>",
  "attachments": [{ "filename": "f.pdf", "size": 12345 }]
}
```

`list` 默认不返回全文(只给 snippet 摘要);要全文用 `read <uid>`。

## 🔧 前置:确认环境

1. 检查 `.env` 是否存在。没有 → 提示用户:
   > 请复制 `.env.example` 为 `.env`,填入 `EMAIL_USER`(邮箱)和 `EMAIL_PASS`(授权码)。授权码不是登录密码,获取方式见 `docs/foxmail-setup.md`。
2. 不确定配置对不对 → 跑 `node scripts/doctor.js`,三项 ok 即通。

## 🎬 典型工作流

**收信场景**(用户:"看看我邮箱"):
1. `node scripts/imap.js list --limit 10 --format text` → 拿到列表
2. 从 JSON 解析出每封的 uid/subject/from
3. 向用户汇报;用户要看哪封 → `node scripts/imap.js read <uid>`

**分类整理场景**(用户:"把我邮件分类导出 Excel"):
1. `node examples/workflow/pipeline.js --out ./output/report.xlsx --since-days 30`
2. 自动完成:拉取 → 规则分类 → 提取字段(订单号/金额/验证码)→ 生成 xlsx
3. 告诉用户文件路径

**发信场景**(用户:"给 X 发封邮件说 Y"):
1. `node scripts/smtp.js send --to X --subject 标题 --text Y`

## ⚙️ 分类规则(可自定义)

默认用 `examples/classifier/rules.example.json`。想自定义:
- 复制一份为 `rules.json`,改 `fromContains`/`subjectContains`/`extract`
- 跑 `node examples/classifier/classify.js --rules rules.json`
- 真实邮箱范例:`examples/classifier/rules.realbox.example.json`

规则结构与字段提取正则写法,见 `docs/extend-guide.md`。

## 🚦 错误处理

- 命令失败会输出 `错误:...` 到 stderr,exit code 非 0
- 常见:`认证失败` = 授权码错或服务没开;`Socket timeout` = 网络慢,调大 `.env` 的 `EMAIL_TIMEOUT`
- 排查第一步永远是 `node scripts/doctor.js`

## 📌 边界

- 核心 `scripts/`:**通用收发能力,不要加业务逻辑**。分类/提取/写表都在 `examples/`
- 想做自己的下游:复制 `examples/` 改,或直接 `require('./scripts/lib/client')` 用核心库
- 详细架构与扩展见 `docs/`(foxmail-setup / extend-guide / architecture)
