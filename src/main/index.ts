// Electron 主进程入口。
// 作用：
// 1. 执行平台启动配置。
// 2. 编排 IPC 注册、主窗口创建、托盘和应用生命周期。
// 3. 保持入口文件只承担启动编排，不直接承载窗口、IPC 和平台细节。
import { app, type BrowserWindow, type Tray } from "electron";
import { registerIpc } from "./ipc/registerIpc";
import { configureLinuxStartup } from "./platform/linuxStartup";
import { startReminderScheduler } from "./reminders/reminderScheduler";
import { dataPath, readData } from "./store";
import { writeJsonFile } from "./store/writeJsonFile";
import { createAppTray } from "./tray/createAppTray";
import { createMainWindow } from "./window/createMainWindow";
import type { IdeaSettings } from "@shared/types";

configureLinuxStartup(app);

// 主窗口引用只保存在主进程内，用于校验 IPC 请求来源和管理窗口生命周期。
let mainWindow: BrowserWindow | null = null;
let appTray: Tray | null = null;
let currentSettings: IdeaSettings | null = null;
let isQuitting = false;

function openMainWindow(settings: IdeaSettings): BrowserWindow {
  mainWindow = createMainWindow({
    settings,
    savedBounds: settings.windowBounds,
    onClosed: () => {
      mainWindow = null;
    },
  });
  mainWindow.on("close", (event) => {
    // 窗口关闭前保存 bounds，此时主窗口引用仍然有效。
    void saveWindowBounds();
    if (!currentSettings?.minimizeToTrayOnClose || isQuitting) return;
    event.preventDefault();
    mainWindow?.hide();
  });
  return mainWindow;
}

async function saveWindowBounds(): Promise<void> {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const bounds = mainWindow.getBounds();
      const isMaximized = mainWindow.isMaximized();
      const data = await readData();
      data.settings.windowBounds = {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized,
      };
      await writeJsonFile(dataPath(), data);
    }
  } catch {
    // 保存失败不中断关闭/退出流程。
  }
}

async function openMainWindowFromCurrentSettings(): Promise<BrowserWindow> {
  const data = await readData();
  currentSettings = data.settings;
  return openMainWindow(data.settings);
}

app.on("before-quit", async () => {
  isQuitting = true;
  // 兜底保存：防止通过托盘退出等路径未触发窗口 close 事件的情况。
  await saveWindowBounds();
});

function destroyTray(): void {
  appTray?.destroy();
  appTray = null;
}

app.whenReady().then(async () => {
  const data = await readData();
  currentSettings = data.settings;
  registerIpc({
    getMainWindow: () => mainWindow,
    onSettingsSaved: (settings) => {
      currentSettings = settings;
    },
  });
  // 不显示默认菜单，让应用保持原型中的沉浸式自定义标题栏体验。
  app.applicationMenu = null;
  openMainWindow(data.settings);
  appTray = createAppTray({
    app,
    getWindow: () => mainWindow,
    onQuit: () => {
      isQuitting = true;
      destroyTray();
    },
  });
  startReminderScheduler((noteId) => {
    const win = mainWindow;
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
    win.webContents.send("notification:open-note", noteId);
  });

  // macOS 点击 Dock 图标时，如果没有窗口则重新创建窗口。
  app.on("activate", () => {
    if (mainWindow) {
      mainWindow.show();
      return;
    }
    void openMainWindowFromCurrentSettings();
  });
});

app.on("window-all-closed", () => {
  if (currentSettings?.minimizeToTrayOnClose && !isQuitting) return;
  destroyTray();
  // macOS 保持常驻，其它平台关闭最后一个窗口即退出应用。
  if (process.platform !== "darwin") app.quit();
});
