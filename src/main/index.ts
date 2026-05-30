// Electron 主进程入口。
// 作用：
// 1. 创建无边框桌面窗口，并在开发/生产环境加载对应的渲染入口。
// 2. 注册笔记数据读写、窗口控制和开机自启动相关 IPC handler。
// 3. 校验 IPC 消息来源，确保只有当前主窗口可以调用桌面能力。
// 4. 管理应用生命周期，例如 macOS 激活行为和非 macOS 平台关闭退出。
import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";
import { readData, saveData } from "./store";
import type { DesktopWindowState, IdeaNotesData } from "@shared/types";

if (process.platform === "linux") {
  app.setName("idea-notes");

  // Linux 开发环境可能无法启动 GPU 进程，必须在 app ready 前禁用 sandbox/GPU 相关启动路径。
  if (!app.isPackaged) {
    app.disableHardwareAcceleration();
    app.commandLine.appendSwitch("no-sandbox");
    app.commandLine.appendSwitch("disable-gpu-sandbox");
    app.commandLine.appendSwitch("in-process-gpu");
  }
}

// 主窗口引用只保存在主进程内，用于校验 IPC 请求来源和管理窗口生命周期。
let mainWindow: BrowserWindow | null = null;

const desktopWindowIconPath =
  process.platform === "linux" || process.platform === "win32"
    ? join(__dirname, "../../build/icons/icon.png")
    : undefined;

// 将 Electron 的窗口状态压缩成 renderer 需要展示的最小状态对象。
function getWindowState(window: BrowserWindow): DesktopWindowState {
  return {
    isAlwaysOnTop: window.isAlwaysOnTop(),
    isMaximized: window.isMaximized(),
  };
}

// 所有 IPC handler 都先确认消息来自当前主窗口，避免其他 WebContents 伪造调用。
function assertMainWindow(senderWindow: BrowserWindow | null): BrowserWindow {
  if (!senderWindow || senderWindow !== mainWindow) {
    throw new Error("Invalid IPC sender");
  }
  return senderWindow;
}

// 创建无边框桌面窗口，标题栏由 React 渲染层自己绘制。
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 960,
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

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// 注册应用需要的全部 IPC 通道；renderer 不能自定义通道名，只能调用 preload 暴露的方法。
function registerIpc(): void {
  ipcMain.handle("notes:get-data", async (event) => {
    assertMainWindow(BrowserWindow.fromWebContents(event.sender));
    return readData();
  });

  ipcMain.handle("notes:save-data", async (event, data: IdeaNotesData) => {
    assertMainWindow(BrowserWindow.fromWebContents(event.sender));
    // 数据结构由 shared 类型约束，真正写盘统一交给 store 层。
    return saveData(data);
  });

  ipcMain.handle("window:minimize", (event) => {
    const window = assertMainWindow(
      BrowserWindow.fromWebContents(event.sender),
    );
    window.minimize();
    return getWindowState(window);
  });

  ipcMain.handle("window:toggle-maximize", (event) => {
    const window = assertMainWindow(
      BrowserWindow.fromWebContents(event.sender),
    );
    if (window.isMaximized()) window.unmaximize();
    else window.maximize();
    return getWindowState(window);
  });

  ipcMain.handle("window:close", (event) => {
    const window = assertMainWindow(
      BrowserWindow.fromWebContents(event.sender),
    );
    window.close();
  });

  ipcMain.handle("window:toggle-always-on-top", (event) => {
    const window = assertMainWindow(
      BrowserWindow.fromWebContents(event.sender),
    );
    window.setAlwaysOnTop(!window.isAlwaysOnTop());
    return getWindowState(window);
  });

  ipcMain.handle("app:set-startup", (event, enabled: boolean) => {
    assertMainWindow(BrowserWindow.fromWebContents(event.sender));
    // 开机自启动必须在主进程调用系统 API，renderer 只传递布尔意图。
    app.setLoginItemSettings({ openAtLogin: enabled });
    return app.getLoginItemSettings().openAtLogin;
  });
}

app.whenReady().then(() => {
  registerIpc();
  // 不显示默认菜单，让应用保持原型中的沉浸式自定义标题栏体验。
  app.applicationMenu = null;
  createWindow();

  // macOS 点击 Dock 图标时，如果没有窗口则重新创建窗口。
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  // macOS 保持常驻，其它平台关闭最后一个窗口即退出应用。
  if (process.platform !== "darwin") app.quit();
});
