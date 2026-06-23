# Simple Email

> 通用 IMAP/SMTP 邮件技能 —— 任意 agent 加载即可收发邮件。

一个面向 AI agent 的通用 email skill。核心提供**收发邮件**这一通用能力(列出/读取/搜索/标记/附件/发送),兼容 Foxmail、QQ、163、126、Gmail、Outlook、新浪等所有标准 IMAP/SMTP 服务。附带分类与工作流**示例**,演示如何向下游延展(分类 → 提取 → 写表)。

## 特性

- ✅ **通用核心**:`scripts/` 只做收发,任意 agent 可加载,不被业务逻辑污染
- ✅ **开箱即用**:按邮箱后缀自动识别服务商(QQ/163/Gmail…),零配置 host
- ✅ **结构化输出**:所有命令输出 JSON,便于程序解析
- ✅ **可延展**:附规则分类器 + 端到端工作流案例(输出 CSV/xlsx)
- ✅ **可测试**:纯逻辑单测 34 项全绿 + 真实账号端到端验证
- ✅ **凭据安全**:`.env` 本地配置,不入库

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置凭据
cp .env.example .env
# 编辑 .env,填入 EMAIL_USER 和 EMAIL_PASS(授权码,非登录密码)

# 3. 自检连通性
npm run doctor
```

三步全 `ok` 即配置成功。获取 Foxmail/QQ 授权码见 [docs/foxmail-setup.md](docs/foxmail-setup.md)。

## 核心用法

```bash
# 收信
node scripts/imap.js list --unread --limit 10 --format text   # 未读列表
node scripts/imap.js read 1001                                 # 读某封(按 UID)
node scripts/imap.js search "发票"                             # 搜索
node scripts/imap.js mark 1001 --read                          # 标记已读
node scripts/imap.js attach 1001                               # 下载附件

# 发信
node scripts/smtp.js send --to a@b.com --subject "标题" --text "正文"
node scripts/smtp.js send --to a@b.com --subject "带附件" --text "见附件" --attach ./file.pdf

# 诊断
node scripts/doctor.js
```

## 示例:分类与工作流

仓库 `examples/` 提供两个示范,展示核心如何向下游延展(可整体删除而不影响核心):

**案例 1 · 规则分类 + 字段提取**(零依赖规则引擎):

```bash
# 用默认示例规则,对最近 50 封邮件分类
node examples/classifier/classify.js --limit 50 --out result.json
# 离线测试(不联网)
node examples/classifier/classify.js --dry-run --in examples/classifier/fixture.json
```

**案例 2 · 完整工作流**(拉取 → 分类 → 提取 → 写表):

```bash
node examples/workflow/pipeline.js --out ./output/result.xlsx --since-days 7 --unread
# 同时输出 csv 和 xlsx
node examples/workflow/pipeline.js --out ./output/report --format both --in examples/classifier/fixture.json
```

自定义分类规则、接 LLM、换输出 sink,见 [docs/extend-guide.md](docs/extend-guide.md)。

## 项目结构

```
simple-email/
├── SKILL.md                 # agent 加载入口(核心能力说明)
├── scripts/                 # 核心 CLI(收发能力,稳定不轻易改)
│   ├── imap.js  smtp.js  doctor.js
│   └── lib/  client.js  config.js  format.js
├── examples/                # 案例(可剥离,展示如何延展)
│   ├── classifier/          # 规则分类 + 字段提取
│   └── workflow/            # 端到端 pipeline + sinks(csv/xlsx)
├── docs/                    # 文档
├── test/                    # 单元测试
└── .env.example             # 凭据模板
```

分层理念详见 [docs/architecture.md](docs/architecture.md)。

## 测试

```bash
npm test        # 34 项纯逻辑单测
```

真实账号端到端验证(填好 `.env` 后):

```bash
node scripts/doctor.js                                    # 连通性
node scripts/imap.js list --limit 3 --format text         # 真实收信
```

## 服务商兼容

Foxmail · QQ · 163 · 126 · Gmail · Outlook/Hotmail · 新浪 · 任意自定义 IMAP/SMTP

## License

MIT
