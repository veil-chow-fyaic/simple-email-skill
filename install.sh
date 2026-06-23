#!/usr/bin/env bash
# ============================================================
#  simple-email skill 安装脚本
#  把 skill 安装到指定 agent 的 skills 目录,或全局可用位置。
#
#  用法:
#    ./install.sh claude      # 装到 Claude Code 个人目录 ~/.claude/skills/
#    ./install.sh codex       # 装到 Codex ~/<repo>/.agents/skills/ (见说明)
#    ./install.sh global      # 装到 ~/.simple-email-skill/(手动引用)
#    ./install.sh             # 交互式选择
#
#  安装方式默认「软链接」(更新仓库即生效);加 --copy 改为拷贝。
# ============================================================
set -euo pipefail

SKILL_NAME="simple-email"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$HERE/skills/$SKILL_NAME"
MODE="link"

# 解析参数
TARGET=""
for arg in "$@"; do
  case "$arg" in
    --copy) MODE="copy" ;;
    --link) MODE="link" ;;
    claude|codex|global) TARGET="$arg" ;;
    *) echo "未知参数: $arg"; exit 2 ;;
  esac
done

# 校验源目录
if [ ! -f "$SRC/SKILL.md" ]; then
  echo "✗ 找不到 skill 源: $SRC/SKILL.md"
  echo "  请在仓库根目录运行本脚本。"
  exit 1
fi

# 交互式选择目标
if [ -z "$TARGET" ]; then
  echo "把 simple-email skill 安装到哪个 agent?"
  echo "  1) Claude Code  (~/.claude/skills/)"
  echo "  2) Codex        (~/.codex/skills/)"
  echo "  3) 全局         (~/.simple-email-skill/)"
  printf "选择 [1-3]: "
  read -r choice
  case "$choice" in
    1) TARGET="claude" ;;
    2) TARGET="codex" ;;
    3) TARGET="global" ;;
    *) echo "无效选择"; exit 2 ;;
  esac
fi

# 确定目标目录
case "$TARGET" in
  claude) DEST_DIR="$HOME/.claude/skills" ;;
  codex)
    # Codex skills 目录:优先项目级,退回用户级
    DEST_DIR="${CODEX_HOME:-$HOME/.codex}/skills"
    ;;
  global) DEST_DIR="$HOME/.simple-email-skill" ;;
esac

DEST="$DEST_DIR/$SKILL_NAME"

echo "→ 安装 $SKILL_NAME → $DEST ($MODE)"

mkdir -p "$DEST_DIR"

# 清理旧安装
if [ -e "$DEST" ] || [ -L "$DEST" ]; then
  echo "  已存在,先移除旧的"
  rm -rf "$DEST"
fi

if [ "$MODE" = "link" ]; then
  ln -s "$SRC" "$DEST"
  echo "  ✓ 软链接已创建"
else
  # 拷贝时排除 node_modules(用户在目标处重装)
  cp -R "$SRC" "$DEST"
  rm -rf "$DEST/node_modules"
  echo "  ✓ 已拷贝(node_modules 已排除)"
fi

# 安装依赖(用 npm install 让 skill 可直接跑)
echo "→ 安装依赖..."
if command -v npm >/dev/null 2>&1; then
  if [ "$MODE" = "link" ]; then
    # 软链接:依赖装在源目录即可
    ( cd "$SRC" && npm install --no-audit --no-fund --silent 2>/dev/null || echo "  ⚠ npm install 失败,请稍后在 $SRC 手动运行" )
  else
    ( cd "$DEST" && npm install --no-audit --no-fund --silent 2>/dev/null || echo "  ⚠ npm install 失败,请稍后在 $DEST 手动运行" )
  fi
else
  echo "  ⚠ 未检测到 npm,请先安装 Node.js,再在 skill 目录运行 npm install"
fi

echo ""
echo "✅ 安装完成!"
echo ""
case "$TARGET" in
  claude)
    echo "Claude Code 会自动发现 ~/.claude/skills/ 下的 skill。"
    echo "重启 Claude Code 后,即可通过对话触发,或用 /simple-email 直接调用。"
    echo ""
    echo "下一步:配置邮箱凭据"
    echo "  cp $SRC/.env.example $HOME/.claude/.env  (或放到你的项目)"
    echo "  详见 $SRC/docs/foxmail-setup.md"
    ;;
  codex)
    echo "Codex 会自动发现 skills/ 目录下的 skill。"
    echo "重启 Codex 后即可使用。"
    echo ""
    echo "下一步:配置邮箱凭据"
    echo "  详见 $SRC/docs/foxmail-setup.md"
    ;;
  global)
    echo "skill 已放在 $DEST"
    echo "在你的 agent 配置中引用该路径,或按 agent 文档手动纳入。"
    ;;
esac
