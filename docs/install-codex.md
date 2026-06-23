# 安装到 Codex (OpenAI)

Codex 支持 [Agent Skills 开放标准](https://developers.openai.com/codex/skills),采用与 Claude 相同的 `SKILL.md` 格式,本 skill 无需改动即可使用。

Codex 的 skills 目录为 `$CODEX_HOME/skills/`(默认 `~/.codex/skills/`)。

> 参考:[Codex Agent Skills 官方文档](https://developers.openai.com/codex/skills)

## 方式一:一键脚本(推荐)

clone 本仓库后,在仓库根目录运行:

```bash
./install.sh codex
```

脚本会把 skill 软链接到 `~/.codex/skills/simple-email`,并自动安装依赖。

## 方式二:手动

```bash
git clone https://github.com/veil-chow-fyaic/simple-email-skill.git
cd simple-email-skill

# 装 skill 依赖
cd skills/simple-email && npm install && cd ../..

# 软链接到 Codex skills 目录
mkdir -p ~/.codex/skills
ln -s "$(pwd)/skills/simple-email" ~/.codex/skills/simple-email
```

## 验证

重启 Codex,skill 会被自动发现。在对话中描述邮件相关任务即可触发,例如「列出我邮箱里最近的未读邮件」。

跑自检确认配置:

```bash
node ~/.codex/skills/simple-email/scripts/doctor.js
```

## 配置邮箱凭据

skill 依赖 `.env`。在**你的项目根目录**(Codex 的运行目录)创建:

```bash
cp ~/.codex/skills/simple-email/.env.example ./.env
# 编辑 .env,填 EMAIL_USER 和 EMAIL_PASS(授权码)
```

授权码获取见 skill 内的 `docs/foxmail-setup.md`。

## 用 AGENTS.md 固化偏好(可选)

如果你想让 Codex 在本项目里默认使用这个 skill,可在项目根加 `AGENTS.md`:

```markdown
# 本项目使用 simple-email skill 处理邮件

涉及收发邮件、邮件分类时,优先调用 simple-email skill 的脚本
(scripts/imap.js / scripts/smtp.js / examples/workflow/pipeline.js)。
邮箱凭据在项目根 .env。
```

> 参考:[Codex AGENTS.md 指南](https://developers.openai.com/codex/guides/agents-md)

## 关于 AGENTS.md vs SKILL.md

| 文件 | 作用 | 谁写 |
|---|---|---|
| `SKILL.md` | skill 的能力说明,Codex 自动发现 | skill 作者(本项目已提供) |
| `AGENTS.md` | 给 agent 的项目级指令 | 你(按项目定制) |

本 skill 自带 `SKILL.md`,你通常只需配 `.env`,按需加 `AGENTS.md`。
