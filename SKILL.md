---
name: simple-email
description: 通用 IMAP/SMTP 邮件技能。任意 agent 加载即可获得收发邮件能力:列出/读取/搜索邮件、标记已读未读、下载附件、发送纯文本/HTML/带附件邮件。兼容 Foxmail、QQ、163、126、Gmail、Outlook、新浪等所有标准 IMAP/SMTP 服务。输出结构化 JSON,便于程序处理。
---

# Simple Email — 通用邮件技能

一个可被任意 agent 加载的通用 email skill。本技能只提供**通用收发能力**;分类、提取、写表等业务逻辑属于下游扩展(见仓库 `examples/` 与 `docs/extend-guide.md`)。

## 你能做什么

| 能力 | 命令 |
|---|---|
| 列出邮件 | `node scripts/imap.js list [--limit 20] [--unread] [--mailbox INBOX]` |
| 读取一封 | `node scripts/imap.js read <uid>` |
| 搜索 | `node scripts/imap.js search <关键词>` |
| 标记已读/未读 | `node scripts/imap.js mark <uid> --read` / `--unread` |
| 下载附件 | `node scripts/imap.js attach <uid>` |
| 列出信箱 | `node scripts/imap.js mailbox` |
| 发邮件 | `node scripts/smtp.js send --to a@b.com --subject 标题 --text 内容` |
| 自检连通性 | `node scripts/doctor.js` |

所有命令默认输出 JSON。`--format text` 给人类可读摘要。

## 前置:配置凭据(一次性)

1. 复制 `.env.example` 为 `.env`
2. 填入 `EMAIL_USER`(邮箱地址)和 `EMAIL_PASS`(**授权码,不是登录密码**)
3. 服务商一般按邮箱后缀自动识别(foxmail→qq 服务器、@163→163 …);无需手动填 host

获取授权码见 `docs/foxmail-setup.md`(Foxmail/QQ/163/Gmail 均有图文)。

跑一次自检确认连通:

```bash
node scripts/doctor.js
```

三步全 `ok` 即配置正确。

## 典型用法(agent 视角)

收到「看一下我的未读邮件」之类的请求时:
1. 先确认 `.env` 存在(否则提示用户配置)
2. `node scripts/imap.js list --unread --limit 10 --format text` 拿到未读列表
3. 用户要看某封 → `node scripts/imap.js read <uid>`
4. 用户要发邮件 → `node scripts/smtp.js send ...`

输出都是结构化 JSON,可直接解析后向用户汇报。

## 服务商兼容性

| 邮箱 | 后缀 | IMAP | SMTP | 说明 |
|---|---|---|---|---|
| Foxmail / QQ | @foxmail.com @qq.com | imap.qq.com:993 | smtp.qq.com:465 | 走 QQ 服务器,授权码登录 |
| 网易 163/126 | @163.com @126.com | imap.163.com:993 | smtp.163.com:465 | 客户端授权密码 |
| Gmail | @gmail.com | imap.gmail.com:993 | smtp.gmail.com:465 | 两步验证 + 应用专用密码 |
| Outlook | @outlook/@hotmail/@live | outlook.office365.com:993 | smtp.office365.com:587 | 账号密码 |
| 新浪 | @sina.com | imap.sina.com:993 | smtp.sina.com:465 | 授权码 |
| 其他 | — | 自定义 | 自定义 | `EMAIL_PRESET=custom` + `IMAP_HOST/SMTP_HOST` |

## 扩展:这个 skill 如何向下游延展

本技能是「邮件驱动信息处理」工作流的**前置通用层**。常见下游:

- **分类 + 字段提取** → 见 `examples/classifier/`(规则引擎,零依赖,可单测)
- **拉取→分类→提取→写表** → 见 `examples/workflow/`(端到端 pipeline,输出 CSV/xlsx)
- **接入 LLM 语义分类** → 见 `docs/extend-guide.md`

> 想做邮件分类/写表?不要改核心 `scripts/`。把 `examples/` 复制一份、改规则或换 sink 即可。核心保持干净,业务可剥离。

详见 `docs/extend-guide.md`(授人以渔)与 `docs/architecture.md`(分层说明)。
