// 开机自启动系统集成。
// 作用：
// 1. 封装 Electron 登录项设置。
// 2. 让 IPC handler 只负责校验 payload 和返回结果。
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { App } from "electron";

const desktopFileName = "idea-notes.desktop";

function getLinuxAutostartPath(app: App): string {
  const configHome =
    process.env.XDG_CONFIG_HOME || join(app.getPath("home"), ".config");
  return join(configHome, "autostart", desktopFileName);
}

function quoteDesktopExecPath(path: string): string {
  return `"${path.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function createLinuxDesktopEntry(app: App): string {
  return [
    "[Desktop Entry]",
    "Type=Application",
    "Name=灵感笔记",
    `Exec=${quoteDesktopExecPath(app.getPath("exe"))} %U`,
    "Terminal=false",
    "Icon=idea-notes",
    "StartupWMClass=idea-notes",
    "Comment=本地管理灵感、笔记、标签和清单",
    "Categories=Office;",
    "X-GNOME-Autostart-enabled=true",
    "",
  ].join("\n");
}

function setLinuxStartup(app: App, enabled: boolean): boolean {
  const autostartPath = getLinuxAutostartPath(app);
  if (enabled) {
    mkdirSync(dirname(autostartPath), { recursive: true });
    writeFileSync(autostartPath, createLinuxDesktopEntry(app), "utf8");
    return existsSync(autostartPath);
  }

  rmSync(autostartPath, { force: true });
  return false;
}

export function setStartup(app: App, enabled: boolean): boolean {
  if (process.platform === "linux") {
    return setLinuxStartup(app, enabled);
  }

  // 开机自启动必须在主进程调用系统 API，renderer 只传递布尔意图。
  app.setLoginItemSettings({ openAtLogin: enabled });
  return app.getLoginItemSettings().openAtLogin;
}
