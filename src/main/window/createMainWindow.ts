// 主窗口创建模块。
// 作用：
// 1. 创建无边框桌面窗口。
// 2. 管理 preload、桌面图标和开发/生产 renderer 入口。
// 3. 提供 renderer 需要展示的最小窗口状态。
import { BrowserWindow } from "electron";
import { join } from "node:path";
import type { DesktopWindowState } from "@shared/types";

export const desktopWindowIconPath =
  process.platform === "linux" || process.platform === "win32"
    ? join(__dirname, "../../build/icons/icon.png")
    : undefined;

// 将 Electron 的窗口状态压缩成 renderer 需要展示的最小状态对象。
export function getWindowState(window: BrowserWindow): DesktopWindowState {
  return {
    isAlwaysOnTop: window.isAlwaysOnTop(),
    isMaximized: window.isMaximized(),
  };
}

export function createMainWindow(onClosed: () => void): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 720,
    minHeight: 640,
    title: "灵感笔记",
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#f8fafc",
    icon: desktopWindowIconPath,
    webPreferences: {
      // preload 是 renderer 唯一能接触桌面能力的桥接入口。
      preload: join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      // 当前 preload 使用 electron IPC；保持 renderer 无 Node 能力，后续可继续收紧 sandbox。
      sandbox: false,
    },
  });
  if (desktopWindowIconPath) mainWindow.setIcon(desktopWindowIconPath);

  // 开发时加载 Vite dev server，生产/预览时加载构建后的静态入口。
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  mainWindow.on("closed", onClosed);
  return mainWindow;
}
