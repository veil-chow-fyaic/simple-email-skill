# Simple Email — 设计文档

- **日期**:2026-06-23
- **状态**:已实现
- **定位**:通用 IMAP/SMTP email skill,任意 agent 可加载;附分类与工作流案例

## 1. 背景与目标

邮件驱动的信息处理是常见需求(收邮件 → 分类 → 提取 → 记录)。现有方案要么把收发与业务耦合,要么针对单一 agent。本项目的目标:

- 提供**通用收发能力**,作为任意 agent 的可复用前置层
- 用**案例**演示如何向下游延展(分类、提取、写表),但核心保持干净
- 最终以 **GitHub 仓库**(文档 + 脚本)形式交付,使用者复制即可用

## 2. 关键设计决策

| 决策点 | 选择 | 理由 |
|---|---|---|
| 仓库范围 | 核心通用 skill + 分类/工作流作为可剥离案例 | 对应「核心保持干净,案例是示范」的定位 |
| 语言 | Node.js | 与参考项目 simple-email 对齐,迁移成本低 |
| agent 接入 | Skill + CLI 脚本(非 MCP) | 零额外进程、调试简单、兼容现有 skill 体系 |
| 分类方式 | 规则引擎(零依赖) | 可预测、可单测、聚焦演示「结构化」而非智能 |
| 表格输出 | CSV + xlsx 双 sink | CSV 通用零依赖,xlsx 带格式,exceljs 作可选依赖 |
| 凭据存储 | .env 本地配置 | 简单、足够安全、不入库 |
| 测试 | 纯逻辑单测 + 真实账号端到端 | 纯逻辑离线可跑;真实账号验证靠填 .env 后一条命令 |

## 3. 架构:分层隔离

```
业务层    examples/  (可剥离,展示如何延展)
          ├─ classifier/  规则分类 + 字段提取
          └─ workflow/    端到端 pipeline + sinks
核心层    scripts/   (稳定,不轻易改)
          ├─ imap.js smtp.js doctor.js
          └─ lib/  client(连接) config(配置) format(标准化)
配置层    .env      (本地凭据)
```

**核心原则**:核心层只提供「标准化的邮件对象」这一数据契约;业务层消费它。核心升级不影响业务,业务怎么改不影响核心。

## 4. 数据契约

所有收信命令输出同一个结构(见 `scripts/lib/format.js` 的 `normalize`):

```json
{
  "uid", "messageId", "subject",
  "from": {"name","address"}, "to": [{"name","address"}],
  "date", "flags": [],
  "text", "html", "attachments": [{"filename","contentType","size"}]
}
```

下游(分类、写表)只依赖这个结构,不依赖 IMAP 细节。

## 5. 模块职责

### 核心层
- `config.js`:服务商预设(foxmail/qq/163/126/gmail/outlook/sina/custom)+ 后缀自动识别 + 校验。纯逻辑。
- `client.js`:IMAP/SMTP 连接工厂 + .env 读取。集中 TLS/错误处理。
- `format.js`:邮件对象标准化 + 输出格式化(JSON/text)。
- `imap.js` / `smtp.js` / `doctor.js`:CLI,只做参数解析与调度。

### 案例层
- `classifier/engine.js`:纯函数分类引擎(规则匹配 + 正则提取),可单测。
- `classifier/classify.js`:CLI,复用核心 client + format。
- `workflow/pipeline.js`:端到端,复用 classifier + sinks。
- `workflow/sinks/csv.js` / `xlsx.js`:输出 sink,提取字段加 `ext_` 前缀避免与基础列冲突。

## 6. 错误处理

- 配置缺失 → `ConfigError`,消息指导用户「复制 .env.example」
- 连接失败 → 统一在 CLI 顶层 catch,输出 `错误:...` 并 exit 1
- doctor 自检 → 逐步报告 IMAP/SMTP 连通状态,定位「是配置错还是网络错」
- exceljs 未装 → 明确提示「npm install exceljs 或用 csv」,不崩溃

## 7. 测试策略

- **纯逻辑**(config/format/engine/csv-sink/pipeline 路径)→ node:test 离线单测,40 项
- **案例 pipeline** → `--dry-run --in fixture.json` 离线跑全链路
- **真实账号** → `node scripts/doctor.js` + `imap list` 端到端(填 .env 后)

## 8. 已知限制

- 无 IDLE 实时推送(轮询为主),适合定时任务而非实时
- 规则分类非语义,复杂场景需换 LLM(extend-guide 已示范)
- 真实账号端到端需使用者自备授权码(本仓库无法替测)

## 9. 交付物清单

```
SKILL.md              agent 加载入口
README.md             仓库门面
package.json          依赖 + npm scripts
.env.example          凭据模板
scripts/              核心 CLI(3 命令 + 3 库)
examples/             2 个案例(classifier + workflow)
docs/                 foxmail-setup / extend-guide / architecture / 本设计文档
test/                 5 个测试文件,40 项
LICENSE               MIT
```
