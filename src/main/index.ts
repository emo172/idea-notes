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
import { openOrFocusWindowForNotification } from "./window/notificationWindowOpener";
import { createPendingNotificationClicks } from "./window/pendingNotificationClicks";
import { createWindowStatePersistence } from "./window/windowStatePersistence";
import type { IdeaSettings } from "@shared/types";

configureLinuxStartup(app);

// 主窗口引用只保存在主进程内，用于校验 IPC 请求来源和管理窗口生命周期。
let mainWindow: BrowserWindow | null = null;
let appTray: Tray | null = null;
let currentSettings: IdeaSettings | null = null;
let isQuitting = false;
const pendingClicks = createPendingNotificationClicks();
const windowStatePersistence = createWindowStatePersistence({
  getWindow: () => mainWindow,
  readData,
  writeData: async (data) => {
    await writeJsonFile(dataPath(), data);
  },
  shouldHideToTrayOnClose: () => Boolean(currentSettings?.minimizeToTrayOnClose),
  isQuitting: () => isQuitting,
});

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
    void windowStatePersistence.handleWindowClose(event, mainWindow);
  });
  return mainWindow;
}

async function openMainWindowFromCurrentSettings(): Promise<BrowserWindow> {
  const data = await readData();
  currentSettings = data.settings;
  return openMainWindow(data.settings);
}

app.on("before-quit", (event) => {
  isQuitting = true;
  // 兜底保存：防止通过托盘退出等路径未触发窗口 close 事件的情况。
  void windowStatePersistence.handleBeforeQuit(event, () => app.quit());
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
    flushPendingNotificationClicks: pendingClicks.flush,
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
    void openOrFocusWindowForNotification({
      noteId,
      getWindow: () => mainWindow,
      openWindow: openMainWindowFromCurrentSettings,
      pendingClicks,
    }).catch(() => {
      // 通知点击恢复失败不应造成主进程未处理 Promise rejection。
    });
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
