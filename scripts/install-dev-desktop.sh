#!/usr/bin/env bash
# 安装 Linux 开发态桌面入口。
# 作用：
# 1. 让 GNOME/KDE 可通过 StartupWMClass=idea-notes 匹配开发态 Electron 窗口。
# 2. 让 dock/任务栏从本项目的 build/icons/icon.png 读取图标，而不是回退到 Electron 默认图标。
# 3. 只写入当前用户的 ~/.local/share/applications，不修改系统级桌面条目。
set -euo pipefail

APP_ID="idea-notes"
APP_DISPLAY_NAME="灵感笔记 (Dev)"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESKTOP_DIR="${HOME}/.local/share/applications"
DESKTOP_FILE="${DESKTOP_DIR}/${APP_ID}.desktop"
ICON_PATH="${PROJECT_ROOT}/build/icons/icon.png"

if [[ ! -f "${ICON_PATH}" ]]; then
  echo "图标文件不存在：${ICON_PATH}" >&2
  exit 1
fi

mkdir -p "${DESKTOP_DIR}"

cat > "${DESKTOP_FILE}" <<EOF
[Desktop Entry]
Name=${APP_DISPLAY_NAME}
Comment=本地开发环境中的灵感笔记
Exec=sh -lc "cd \"${PROJECT_ROOT}\" && npm run dev"
Icon=${ICON_PATH}
Type=Application
Categories=Office;
StartupNotify=true
StartupWMClass=${APP_ID}
Terminal=false
EOF

chmod 0644 "${DESKTOP_FILE}"
update-desktop-database "${DESKTOP_DIR}" >/dev/null 2>&1 || true

echo "已安装开发态桌面入口：${DESKTOP_FILE}"
echo "如果 dock/任务栏仍显示旧图标，请注销后重新登录，或重启当前桌面 Shell。"
