# Simple Email Skill

> 通用 IMAP/SMTP 邮件技能 —— 任意 AI agent 加载即可收发邮件;附带分类/提取/写表案例。
> 兼容 **Foxmail · QQ · 163 · 126 · Gmail · Outlook · 新浪** 及任意标准 IMAP/SMTP 服务。

---

## TL;DR(太长不看)

**这是什么**:一个 email skill。你的 AI agent 装上它,就能收邮件、发邮件、搜索、下载附件。再配合内置案例,还能自动分类、提取关键字段(订单号/金额/验证码)、导出 Excel 表格。

**3 分钟跑起来**:

```bash
git clone https://github.com/veil-chow-fyaic/simple-email-skill.git
cd simple-email-skill
npm install
cp .env.example .env      # 填邮箱地址 + 授权码(见下方)
node scripts/doctor.js    # 自检,三项 ok 即通
```

**填 .env 只需两行**(Foxmail/QQ 会自动识别服务器):

```ini
EMAIL_USER=你的邮箱@foxmail.com
EMAIL_PASS=你的授权码        # 不是登录密码!获取见 👉 docs/foxmail-setup.md
```

**收邮件 / 发邮件**:

```bash
node scripts/imap.js list --unread --format text     # 看未读
node scripts/smtp.js send --to a@b.com --subject 标题 --text 内容   # 发邮件
```

**自动分类 + 导出 Excel**(真实邮箱验证过的案例):

```bash
node examples/workflow/pipeline.js --out ./output/report.xlsx --since-days 30
```

> 拉取邮件 → 规则分类 → 提取字段 → 生成带颜色的 xlsx 表格。完整演示见 [下方「效果」](#-真实效果)。

---

## 📌 这是给谁用的

- **AI agent 开发者**:想要一个开箱即用的邮件能力,不想自己处理 IMAP/SMTP 协议细节
- **个人/团队**:想把邮箱里的发票、订单、通知自动整理成表格
- **自动化场景**:定时拉取邮件 → 分类 → 记录(对应"邮件驱动信息处理"工作流)

## ✨ 能做什么

| 能力 | 命令 | 说明 |
|---|---|---|
| 列邮件 | `imap list [--unread] [--limit N]` | 默认 JSON,`--format text` 人类可读 |
| 读邮件 | `imap read <uid>` | 含正文/附件列表 |
| 搜索 | `imap search "关键词"` | |
| 标记已读/未读 | `imap mark <uid> --read` | |
| 下载附件 | `imap attach <uid>` | |
| 列信箱 | `imap mailbox` | INBOX/Junk/Sent 等 |
| 发邮件 | `smtp send --to .. --subject .. --text ..` | 支持附件/HTML |
| 自检 | `doctor` | 配置→IMAP→SMTP 三步验证 |
| 分类导表 | `examples/workflow/pipeline.js --out x` | 拉取→分类→提取→CSV/xlsx |

> 命令前缀都是 `node scripts/...` 或 `npm run <name>`。

## 📁 项目结构(核心 vs 案例,边界清晰)

```
simple-email-skill/
├── SKILL.md                 ← agent 加载入口(读这个就知道怎么用)
├── scripts/                 ← 核心:收发能力(稳定,别乱改)
│   ├── imap.js  smtp.js  doctor.js
│   └── lib/  (config 客户端配置 / client 连接 / format 格式化)
├── examples/                ← 案例(可删可改,演示如何扩展)
│   ├── classifier/          ← 规则分类 + 字段提取
│   │   ├── rules.example.json          通用示例规则
│   │   └── rules.realbox.example.json  真实邮箱定制规则范例 ← 推荐看这个
│   └── workflow/            ← 端到端 pipeline(拉取→分类→写表)
│       └── sinks/ csv.js + xlsx.js
├── docs/                    ← 文档(配授权码、扩展指南、架构)
└── test/                    ← 43 项单测
```

**核心理念**:`scripts/` 是通用能力(任意 agent 加载即可用),`examples/` 是可剥离的示范。核心永远干净,业务随便改。

## 🚀 快速开始(人类视角)

### 1. 安装

```bash
npm install
```

### 2. 配置凭据

```bash
cp .env.example .env
```

编辑 `.env`,**只需填两行**(授权码不是登录密码!):

```ini
EMAIL_USER=feng.463728559@foxmail.com
EMAIL_PASS=你的授权码
```

> 🔒 `.env` 已在 `.gitignore` 中,不会进 git。
> 📖 授权码怎么获取(QQ/Foxmail/163/Gmail):[docs/foxmail-setup.md](docs/foxmail-setup.md)(含操作截图)

### 3. 验证

```bash
node scripts/doctor.js
```

```json
{ "ok": true, "pass": 3, "total": 3 }   // ← 三项全 ok 就成功了
```

### 4. 用起来

```bash
# 收信
node scripts/imap.js list --unread --limit 10 --format text
node scripts/imap.js read 1793                    # 读指定 UID

# 发信
node scripts/smtp.js send --to friend@mail.com --subject "测试" --text "你好"

# 分类导表(最有用)
node examples/workflow/pipeline.js --out ./output/report.xlsx --since-days 30 --unread
```

## 🤖 快速开始(Agent 视角)

> Agent 读这段 + `SKILL.md` 即可上手。

1. **检查环境**:确认 `.env` 存在(否则提示用户配置,指向 `docs/foxmail-setup.md`)
2. **收邮件**:所有命令输出**结构化 JSON**,直接解析
3. **输出契约**:邮件对象统一结构(见下),你的处理逻辑只依赖它

```jsonc
// 每封邮件都是这个结构(scripts/lib/format.js 的 normalize 输出)
{
  "uid": 1793,
  "subject": "极速退款成功",
  "from": { "name": "淘宝网", "address": "taobao@news.mail.taobao.com" },
  "to": [{ "name": "", "address": "..." }],
  "date": "2023-07-08T02:04:01.000Z",
  "flags": ["\\Seen"],
  "text": "纯文本正文",
  "html": "<html>正文</html>",
  "attachments": [{ "filename": "f.pdf", "size": 12345 }]
}
```

4. **常用动作**:
   - 用户说"看未读" → `node scripts/imap.js list --unread --format text`
   - 用户要看某封 → `node scripts/imap.js read <uid>`
   - 用户要发邮件 → `node scripts/smtp.js send --to .. --subject .. --text ..`
   - 要分类整理 → `node examples/workflow/pipeline.js --out result.xlsx`

5. **扩展**:要自定义分类/提取,改 `examples/classifier/rules.json`(规则结构见 [docs/extend-guide.md](docs/extend-guide.md)),不用动核心代码。

## 📊 真实效果

在 `feng.463728559@foxmail.com` 真实邮箱上跑的(拉 19 封 → 分类 → 提取 → 导出):

| 分类 | 数量 | 自动提取的字段 |
|---|---|---|
| 电商交易 | 8 | 订单号 `3417791...`、退款金额 `61.20/54.40/158.00/70.20` |
| 云服务通知 | 4 | 阿里云安全周报 |
| 会员/订阅 | 3 | 会员有效期 `2023/07/05` |
| 邮箱通知 | 1 | 网易安全升级 |
| 其他 | 3 | (未匹配规则,可继续调) |

这就是"收邮件 → 分类 → 提取关键字段 → 写入表格"的完整闭环。规则针对真实邮件定制的过程见 `examples/classifier/rules.realbox.example.json`。

## 🧪 测试

```bash
npm test      # 43 项纯逻辑单测,全绿
```

真实账号验证已通过:doctor 三项 ok / IMAP 收信 / SMTP 发信(250 OK) / workflow 端到端。

## 📖 文档

- [docs/foxmail-setup.md](docs/foxmail-setup.md) —— 授权码获取(含截图,QQ/Foxmail/163/Gmail)
- [docs/extend-guide.md](docs/extend-guide.md) —— 怎么自定义分类规则/接 LLM/换输出(授人以渔)
- [docs/architecture.md](docs/architecture.md) —— 为什么这样分层
- [SKILL.md](SKILL.md) —— Agent 加载入口

## 服务商兼容

Foxmail · QQ · 163 · 126 · Gmail · Outlook/Hotmail · 新浪 · 任意自定义 IMAP/SMTP(用 `EMAIL_PRESET=custom`)

## License

MIT
