# 架构说明

## 设计目标

把「邮件收发」这个**通用能力**,和「分类/提取/写表」这类**业务处理**,在物理和概念上彻底隔开:

- 核心 → 任意 agent 加载即可用的通用 skill,永不被业务逻辑污染
- 案例 → 可剥离的示范,展示核心如何延展;删掉不影响核心

## 分层

```
┌─────────────────────────────────────────────────────┐
│  你的业务 / 其他 agent                                │
│  (调用核心库 或 复制 examples 改造)                    │
├─────────────────────────────────────────────────────┤
│  examples/        ← 案例(可剥离)                      │
│   ├─ classifier/  分类 + 字段提取(规则引擎)            │
│   └─ workflow/    拉取→分类→提取→写表(端到端)         │
│         └─ sinks/ csv.js / xlsx.js                   │
├─────────────────────────────────────────────────────┤
│  scripts/         ← 核心 CLI(稳定,不轻易改)          │
│   ├─ imap.js  smtp.js  doctor.js                     │
│   └─ lib/        连接工厂 + 配置 + 格式化              │
│        client.js  config.js  format.js               │
├─────────────────────────────────────────────────────┤
│  .env             ← 凭据(本地,不入库)                 │
└─────────────────────────────────────────────────────┘
```

## 核心层三模块职责

| 文件 | 职责 | 依赖 |
|---|---|---|
| `lib/config.js` | 配置加载、服务商预设识别、校验 | 无(纯逻辑,可单测) |
| `lib/client.js` | IMAP/SMTP 连接工厂、.env 读取 | imapflow, nodemailer |
| `lib/format.js` | 邮件对象标准化、输出格式化 | mailparser |

设计原则:**「如何连」「做什么」「输出什么」三件事分离**。CLI 只做参数解析和调度,逻辑都在 lib。

## 案例层如何复用核心

案例层只依赖核心的稳定接口,不重新实现收发:

```
examples/classifier/classify.js
    └─ require('../../scripts/lib/client')   ← 复用 openImap
    └─ require('../../scripts/lib/format')   ← 复用 normalize
    └─ require('./engine')                   ← 自己的分类逻辑(纯函数)
```

```
examples/workflow/pipeline.js
    └─ 复用 client + format + classifier/engine
    └─ 调用 sinks/csv.js 或 sinks/xlsx.js
```

这意味着:**核心升级(比如换底层库),案例无需改动**;反过来,案例怎么改都不影响核心。

## 数据流

收信场景:
```
.agent/CLI
  └─ openImap() → ImapFlow 连接
       └─ client.search() → UID 列表
            └─ client.fetch(uids) → 原始 message
                 └─ normalize(msg) → 标准 JSON 对象  ← 唯一的对外数据契约
                      └─ printResult() → 控制台 / 下游消费
```

发信场景:
```
.agent/CLI
  └─ createSmtp() → nodemailer transporter
       └─ transporter.sendMail({from,to,subject,text,html,attachments})
            └─ { messageId, response }
```

工作流场景:
```
拉取邮件(normalize) → classifyAll(rules) → 分类+提取后的对象
  → writeCsv / writeXlsx → 文件
```

## 可测试性

- **纯逻辑模块**(config / format / classifier engine / csv sink)→ 完全离线单测,无需邮箱
- **网络模块**(client / IMAP/SMTP CLI)→ 通过 `.env` 接真实账号端到端验证
- **案例 pipeline** → 提供 `--dry-run --in fixture.json` 离线模式,不联网即可跑全链路

单测:`npm test`(34 项,覆盖配置识别、分类匹配、字段提取、CSV 转义、边界情况)。

## 凭据安全

- `.env` 在 `.gitignore` 中,绝不入库
- 仓库只提供 `.env.example` 模板
- 运行时通过 `scripts/lib/client.js` 的 `loadEnv()` 读入 `process.env`
- 授权码不出现在任何日志(SKILL.md / 文档示例里都是占位符)

## 为什么不用 MCP server

评估过加一层常驻 MCP server 的方案。当前选择「Skill + CLI 脚本」是因为:
- 零额外进程、零端口、零状态同步问题
- 与现有 skill 体系(本仓库形态)天然兼容
- 调试简单(直接跑 CLI 看输出)
- 对非 MCP 的 agent 同样可用

若未来确有 MCP 需求,可在核心层之上加一个薄 MCP wrapper 复用 `lib/`,核心无需改动——这正是分层的好处。
