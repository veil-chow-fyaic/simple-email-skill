# Simple Email Skill

> 通用 IMAP/SMTP 邮件技能,装进 AI agent 即可收发邮件、搜索、标记、下载附件,并自动分类导出表格。
> 兼容 **Claude Code · Codex · 任意支持 SKILL.md 标准的 agent**。
> 支持邮箱:**Foxmail · QQ · 163 · 126 · Gmail · Outlook · 新浪** 及任意标准 IMAP/SMTP 服务。

[![tested](https://img.shields.io/badge/tests-43%2F43-brightgreen)](#测试) [![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## 🚀 一键安装

clone 后在仓库根目录运行,**选择你的 agent**:

```bash
git clone https://github.com/veil-chow-fyaic/simple-email-skill.git
cd simple-email-skill

./install.sh claude     # 装到 Claude Code (~/.claude/skills/)
# 或
./install.sh codex      # 装到 Codex (~/.codex/skills/)
```

脚本会把 skill 软链接到 agent 的 skills 目录并装好依赖。重启 agent 后即可使用。

> 想交互式选择?直接 `./install.sh`。完整安装说明:[Claude Code](docs/install-claude-code.md) · [Codex](docs/install-codex.md)

## 🔑 配置邮箱(必做一次)

在你的**项目根目录**创建 `.env`(从 skill 里拷模板):

```bash
cp skills/simple-email/.env.example .env
```

编辑 `.env`,只需两行(Foxmail/QQ 会自动识别服务器):

```ini
EMAIL_USER=你的邮箱@foxmail.com
EMAIL_PASS=你的授权码        # 不是登录密码!获取见 skills/simple-email/docs/foxmail-setup.md
```

验证:

```bash
node skills/simple-email/scripts/doctor.js    # 三项 ok 即通
```

---

## 📌 这是什么

一个 **AI agent skill**。装上后,agent 获得「处理邮件」的能力:收、发、搜索、标记、下载附件,还能自动分类 + 提取关键字段 + 导出 Excel 表格。

适合:
- **让 agent 帮你管邮箱**(「看看我未读」「把这封发票信息整理出来」)
- **邮件驱动的自动化**(定时拉取 → 分类 → 写表,如发票/订单/通知归档)
- **想给任何 agent 加邮件能力的开发者**

## ✨ 能力一览

| 能力 | 命令(在项目目录跑) |
|---|---|
| 列邮件 | `node skills/simple-email/scripts/imap.js list --unread --format text` |
| 读邮件 | `... imap.js read <uid>` |
| 搜索 | `... imap.js search "关键词"` |
| 标记/附件 | `... imap.js mark <uid> --read` / `attach <uid>` |
| 发邮件 | `... smtp.js send --to a@b.com --subject 标题 --text 内容` |
| 自检 | `... doctor.js` |
| 分类导表 | `... examples/workflow/pipeline.js --out report.xlsx` |

> 装进 agent 后,这些命令由 agent 自动调用——你只需自然语言描述需求。

## 📊 真实效果

在真实 Foxmail 邮箱上跑的(拉 19 封 → 分类 → 提取 → 导出 xlsx):

| 分类 | 数量 | 自动提取的字段 |
|---|---|---|
| 电商交易 | 8 | 订单号、退款金额(61.20/54.40/158.00…) |
| 云服务通知 | 4 | 阿里云安全周报 |
| 会员/订阅 | 3 | 会员有效期 |
| 邮箱通知 | 1 | 安全升级提示 |

完整「收邮件 → 分类 → 提取字段 → 写入表格」闭环。规则可自定义,见 [skills/simple-email/docs/extend-guide.md](skills/simple-email/docs/extend-guide.md)。

## 📁 仓库结构

```
simple-email-skill/
├── install.sh                       ← 一键安装脚本
├── docs/                            ← 分发文档
│   ├── install-claude-code.md       ← Claude Code 安装
│   └── install-codex.md             ← Codex 安装
└── skills/
    └── simple-email/                ← 标准 skill 目录(SKILL.md 开头)
        ├── SKILL.md                 ← agent 加载入口
        ├── scripts/                 ← 核心:收发能力
        ├── examples/                ← 案例:分类 + 工作流
        ├── docs/                    ← skill 内文档(配置/扩展/架构)
        └── test/                    ← 43 项单测
```

**核心理念**:核心 `scripts/` 是通用收发能力(任意 agent 可用),`examples/` 是可剥离的业务示范(分类/写表)。核心永远干净,业务随便改。

## 🤖 Agent 怎么用这个 skill

agent 读 `skills/simple-email/SKILL.md` 即知如何调用。邮件对象统一是这个结构(JSON):

```jsonc
{ "uid": 1793, "subject": "...", "from": { "name": "...", "address": "..." },
  "date": "...", "flags": ["\\Seen"], "text": "...", "attachments": [...] }
```

典型动作:用户说"看未读" → agent 跑 `imap.js list --unread`;用户说"分类导出" → agent 跑 `pipeline.js --out x.xlsx`。

## 🧪 测试

```bash
cd skills/simple-email && npm test    # 43 项纯逻辑单测,全绿
```

真实账号已验证:doctor 三项 ok / IMAP 收信 / SMTP 发信(250 OK) / workflow 端到端。

## 📖 文档

**安装**:[Claude Code](docs/install-claude-code.md) · [Codex](docs/install-codex.md)
**使用**(skill 内):
- [skills/simple-email/SKILL.md](skills/simple-email/SKILL.md) — agent 入口
- [skills/simple-email/docs/foxmail-setup.md](skills/simple-email/docs/foxmail-setup.md) — 授权码获取(含截图)
- [skills/simple-email/docs/extend-guide.md](skills/simple-email/docs/extend-guide.md) — 自定义分类/扩展
- [skills/simple-email/docs/architecture.md](skills/simple-email/docs/architecture.md) — 架构说明

## License

MIT
