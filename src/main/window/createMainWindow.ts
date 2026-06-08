// 主窗口创建模块。
// 作用：
// 1. 按设置创建应用级或系统边框桌面窗口。
// 2. 管理 preload、桌面图标和开发/生产 renderer 入口。
// 3. 提供 renderer 需要展示的最小窗口状态，含位置和尺寸信息。
// 4. 支持从保存的 bounds 恢复窗口位置和大小，含离屏坐标校验。
import { BrowserWindow, screen } from "electron";
import { join } from "node:path";
import type { DesktopWindowState, IdeaSettings, WindowBounds } from "@shared/types";

export const desktopWindowIconPath =
  process.platform === "linux" || process.platform === "win32"
    ? join(__dirname, "../../build/icons/icon.png")
    : undefined;

// 校验给定的 x/y 坐标是否至少在一个显示器的 workArea 内。
// 使用 workArea 而非 bounds 可避开任务栏等系统 UI 遮挡区域。
export function isPositionOnScreen(
  x: number,
  y: number,
  displays: { workArea: { x: number; y: number; width: number; height: number } }[],
): boolean {
  return displays.some((d) => {
    const wa = d.workArea;
    return x >= wa.x && y >= wa.y && x < wa.x + wa.width && y < wa.y + wa.height;
  });
}

// 将 Electron 的窗口状态压缩成 renderer 需要展示的最小状态对象。
export function getWindowState(window: BrowserWindow): DesktopWindowState {
  const bounds = window.getBounds();
  return {
    isAlwaysOnTop: window.isAlwaysOnTop(),
    isMaximized: window.isMaximized(),
    bounds: {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized: window.isMaximized(),
    },
  };
}

export interface CreateMainWindowOptions {
  settings: IdeaSettings;
  savedBounds?: WindowBounds;
  onClosed: () => void;
}

export function createMainWindow({
  settings,
  savedBounds,
  onClosed,
}: CreateMainWindowOptions): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: savedBounds?.width ?? 1180,
    height: savedBounds?.height ?? 760,
    minWidth: 720,
    minHeight: 640,
    title: "灵感笔记",
    frame: !settings.appWindowControls,
    titleBarStyle: settings.appWindowControls ? "hidden" : "default",
    show: !settings.silentStart,
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

  // 有保存的窗口状态时优先恢复；离屏坐标回退到构造函数中的默认位置。
  if (savedBounds) {
    if (savedBounds.isMaximized) {
      mainWindow.maximize();
    } else if (
      savedBounds.x !== undefined &&
      savedBounds.y !== undefined &&
      isPositionOnScreen(savedBounds.x, savedBounds.y, screen.getAllDisplays())
    ) {
      mainWindow.setBounds({
        x: savedBounds.x,
        y: savedBounds.y,
        width: savedBounds.width,
        height: savedBounds.height,
      });
    }
  }

  // 开发时加载 Vite dev server，生产/预览时加载构建后的静态入口。
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  mainWindow.on("closed", onClosed);
  return mainWindow;
}
