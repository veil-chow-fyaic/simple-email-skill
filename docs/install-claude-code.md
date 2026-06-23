# 安装到 Claude Code

Claude Code 会自动发现个人 skills 目录 `~/.claude/skills/` 和项目级 `.claude/skills/` 下的所有 skill(含 `SKILL.md` 的目录)。

> 参考:[Claude Code Skills 官方文档](https://code.claude.com/docs/en/skills)

## 方式一:一键脚本(推荐)

clone 本仓库后,在仓库根目录运行:

```bash
./install.sh claude
```

脚本会把 skill 软链接到 `~/.claude/skills/simple-email`,并自动安装依赖。之后仓库更新时,`git pull` 即同步生效(因为是软链接)。

## 方式二:手动

```bash
# 1. clone
git clone https://github.com/veil-chow-fyaic/simple-email-skill.git
cd simple-email-skill

# 2. 装 skill 依赖
cd skills/simple-email && npm install && cd ../..

# 3. 软链接到 Claude Code skills 目录
mkdir -p ~/.claude/skills
ln -s "$(pwd)/skills/simple-email" ~/.claude/skills/simple-email
```

## 验证

重启 Claude Code,然后:

```
/simple-email
```

或直接在对话里说「看看我的未读邮件」,Claude 会自动调用这个 skill。

跑一次自检确认配置:

```bash
node ~/.claude/skills/simple-email/scripts/doctor.js
```

## 配置邮箱凭据

skill 需要 `.env` 才能连邮箱。在**你的项目根目录**(Claude Code 的运行目录)创建 `.env`:

```bash
cp ~/.claude/skills/simple-email/.env.example ./.env
# 编辑 .env,填入 EMAIL_USER 和 EMAIL_PASS(授权码)
```

授权码获取见 `docs/foxmail-setup.md`(在 skill 目录内)。

> 💡 `.env` 放项目根而非 skill 目录,这样不同项目可用不同邮箱账号。

## 两种 skills 目录的区别

| 目录 | 作用域 | 场景 |
|---|---|---|
| `~/.claude/skills/` | 所有项目可用 | 个人 skill(推荐) |
| `<项目>/.claude/skills/` | 仅当前项目 | 项目专属 skill |

本项目默认装个人目录。想项目级安装,把链接目标改成项目的 `.claude/skills/` 即可。
