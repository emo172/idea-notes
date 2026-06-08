// 主进程 IPC 注册模块。
// 作用：
// 1. 注册笔记数据、窗口控制和开机自启动 IPC handler。
// 2. 校验消息来源，确保只有当前主窗口可以调用桌面能力。
// 3. 保持 renderer 只能通过 preload 暴露的固定 API 访问桌面能力。
import { app, BrowserWindow, ipcMain } from "electron";
import { checkRemindersOnce } from "../reminders/reminderScheduler";
import { readData, saveData } from "../store";
import { exportDataFile, importDataFile } from "../store/backup";
import { setStartup } from "../startup/loginItems";
import { getWindowState } from "../window/createMainWindow";
import {
  assertIdeaNotesData,
  sanitizeIdeaNotesData,
} from "@shared/ideaNotesDataValidation";
import type { IdeaSettings, ImportDataMode } from "@shared/types";

// 所有 IPC handler 都先确认消息来自当前主窗口，避免其他 WebContents 伪造调用。
function assertMainWindow(
  senderWindow: BrowserWindow | null,
  mainWindow: BrowserWindow | null,
): BrowserWindow {
  if (!senderWindow || senderWindow !== mainWindow) {
    throw new Error("Invalid IPC sender");
  }
  return senderWindow;
}

interface RegisterIpcOptions {
  getMainWindow: () => BrowserWindow | null;
  onSettingsSaved: (settings: IdeaSettings) => void;
}

export function registerIpc({
  getMainWindow,
  onSettingsSaved,
}: RegisterIpcOptions): void {
  ipcMain.handle("notes:get-data", async (event) => {
    assertMainWindow(BrowserWindow.fromWebContents(event.sender), getMainWindow());
    return readData();
  });

  ipcMain.handle("notes:save-data", async (event, data: unknown) => {
    assertMainWindow(BrowserWindow.fromWebContents(event.sender), getMainWindow());
    const validatedData = assertIdeaNotesData(data);
    const sanitizedData = sanitizeIdeaNotesData(validatedData);
    const savedData = await saveData(sanitizedData);
    onSettingsSaved(savedData.settings);
    void checkRemindersOnce().catch(() => {
      // 保存后的即时提醒检查失败时不阻断用户保存结果。
    });
    return savedData;
  });

  ipcMain.handle("notes:export-data", async (event) => {
    const window = assertMainWindow(
      BrowserWindow.fromWebContents(event.sender),
      getMainWindow(),
    );
    return exportDataFile(window);
  });

  ipcMain.handle("notes:import-data", async (event, mode: ImportDataMode) => {
    const window = assertMainWindow(
      BrowserWindow.fromWebContents(event.sender),
      getMainWindow(),
    );
    if (mode !== "overwrite" && mode !== "merge") {
      throw new Error("Invalid import mode");
    }
    const result = await importDataFile(window, mode);
    if (result.data) onSettingsSaved(result.data.settings);
    return result;
  });

  ipcMain.handle("window:get-state", (event) => {
    const window = assertMainWindow(
      BrowserWindow.fromWebContents(event.sender),
      getMainWindow(),
    );
    return getWindowState(window);
  });

  ipcMain.handle("window:minimize", (event) => {
    const window = assertMainWindow(
      BrowserWindow.fromWebContents(event.sender),
      getMainWindow(),
    );
    window.minimize();
    return getWindowState(window);
  });

  ipcMain.handle("window:toggle-maximize", (event) => {
    const window = assertMainWindow(
      BrowserWindow.fromWebContents(event.sender),
      getMainWindow(),
    );
    if (window.isMaximized()) window.unmaximize();
    else window.maximize();
    return getWindowState(window);
  });

  ipcMain.handle("window:close", (event) => {
    const window = assertMainWindow(
      BrowserWindow.fromWebContents(event.sender),
      getMainWindow(),
    );
    window.close();
  });

  ipcMain.handle("window:toggle-always-on-top", (event) => {
    const window = assertMainWindow(
      BrowserWindow.fromWebContents(event.sender),
      getMainWindow(),
    );
    window.setAlwaysOnTop(!window.isAlwaysOnTop());
    return getWindowState(window);
  });

  ipcMain.handle("app:set-startup", (event, enabled: boolean) => {
    assertMainWindow(BrowserWindow.fromWebContents(event.sender), getMainWindow());
    if (typeof enabled !== "boolean") {
      throw new Error("Invalid startup payload");
    }
    return setStartup(app, enabled);
  });
}
