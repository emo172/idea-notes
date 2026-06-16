// Electron 主进程 IPC 契约回归测试。
// 作用：
// 1. 锁定 IPC handler 仍校验消息来源。
// 2. 验证保存数据前运行时校验和开机自启动 payload 校验仍存在。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("主进程 IPC 契约", () => {
  function getHandlerSource(source: string, channel: string): string | undefined {
    const channelIndex = source.indexOf(`"${channel}"`);
    if (channelIndex === -1) return undefined;
    const start = source.lastIndexOf("ipcMain.handle", channelIndex);
    if (start === -1) return undefined;
    const next = source.indexOf("\n\n  ipcMain.handle", start + 1);
    return source.slice(start, next === -1 ? undefined : next);
  }

  it("注册初始窗口状态 IPC 并校验消息来源", () => {
    const ipcSource = readFileSync(resolve("src/main/ipc/registerIpc.ts"), "utf8");
    const getStateHandler = ipcSource.match(
      /ipcMain\.handle\("window:get-state"[\s\S]*?\n  \}\);/,
    )?.[0];

    expect(getStateHandler).toBeTruthy();
    expect(getStateHandler).toContain("assertMainWindow");
    expect(getStateHandler).toContain("BrowserWindow.fromWebContents");
    expect(getStateHandler).toContain("return getWindowState(window)");
  });

  it("保存笔记数据前先做运行时结构校验", () => {
    const ipcSource = readFileSync(resolve("src/main/ipc/registerIpc.ts"), "utf8");
    const saveHandler = ipcSource.match(
      /ipcMain\.handle\("notes:save-data"[\s\S]*?\n  \}\);/,
    )?.[0];

    expect(ipcSource).toContain('from "@shared/ideaNotesDataValidation"');
    expect(saveHandler).toBeTruthy();
    expect(saveHandler).toContain("assertIdeaNotesData(data)");
    expect(saveHandler).toContain("sanitizeIdeaNotesData(validatedData)");
    expect(saveHandler).toContain("const savedData = await saveData(sanitizedData)");
    expect(saveHandler).toContain("onSettingsSaved(savedData.settings)");
    expect(saveHandler).toContain("checkRemindersOnce()");
    expect(saveHandler).toContain("return savedData");
  });

  it("主进程入口接线通知点击到窗口激活与渲染层推送", () => {
    const mainSource = readFileSync(resolve("src/main/index.ts"), "utf8");

    expect(mainSource).toContain('from "./reminders/reminderScheduler"');

    // 通知点击可能发生在主窗口被销毁后，必须走统一打开或聚焦入口。
    const openerSource = readFileSync(
      resolve("src/main/window/notificationWindowOpener.ts"),
      "utf8",
    );

    expect(mainSource).toContain("startReminderScheduler((noteId)");
    expect(mainSource).toContain("openOrFocusWindowForNotification({");
    expect(mainSource).toContain("getWindow: () => mainWindow");
    expect(mainSource).toContain("openWindow: openMainWindowFromCurrentSettings");
    expect(mainSource).toContain("pendingClicks");
    expect(mainSource).toContain(".catch");

    expect(openerSource).toContain("openOrFocusWindowForNotification");
    expect(openerSource).toContain("pendingClicks");

    // 主入口不应注册 ipcMain handler（这是 main→renderer push，不是 handle）
    expect(mainSource).not.toContain('ipcMain.handle("notification:open-note")');
  });

  it("注册待发通知点击 flush IPC 并校验消息来源", () => {
    const ipcSource = readFileSync(resolve("src/main/ipc/registerIpc.ts"), "utf8");
    const notificationHandler = ipcSource.match(
      /ipcMain\.handle\("notification:flush-pending-clicks"[\s\S]*?\n  \}\);/,
    )?.[0];

    expect(notificationHandler).toBeTruthy();
    expect(notificationHandler).toContain("assertMainWindow");
    expect(notificationHandler).toContain("BrowserWindow.fromWebContents");
    expect(notificationHandler).toContain("flushPendingNotificationClicks()");
    expect(ipcSource).not.toContain('ipcMain.handle("notification:open-note")');
  });

  it("注册数据导出和导入 IPC 并校验消息来源", () => {
    const ipcSource = readFileSync(resolve("src/main/ipc/registerIpc.ts"), "utf8");
    const exportHandler = ipcSource.match(
      /ipcMain\.handle\("notes:export-data"[\s\S]*?\n  \}\);/,
    )?.[0];
    const importHandler = ipcSource.match(
      /ipcMain\.handle\("notes:import-data"[\s\S]*?\n  \}\);/,
    )?.[0];

    expect(ipcSource).toContain('from "../store/backup"');
    expect(exportHandler).toBeTruthy();
    expect(exportHandler).toContain("assertMainWindow");
    expect(exportHandler).toContain("exportDataFile(window)");
    expect(importHandler).toBeTruthy();
    expect(importHandler).toContain("assertMainWindow");
    expect(importHandler).toContain('mode !== "overwrite" && mode !== "merge"');
    expect(importHandler).toContain('throw new Error("Invalid import mode")');
    expect(importHandler).toContain(
      "const result = await importDataFile(window, mode)",
    );
    expect(importHandler).toContain("if (result.data)");
    expect(importHandler).toContain("onSettingsSaved(result.data.settings)");
    expect(importHandler).toContain("return result");
  });

  it("注册 Markdown 文件 IPC 并校验来源与 payload", () => {
    const ipcSource = readFileSync(resolve("src/main/ipc/registerIpc.ts"), "utf8");
    const singleExportHandler = getHandlerSource(
      ipcSource,
      "notes:export-note-markdown",
    );
    const batchExportHandler = getHandlerSource(
      ipcSource,
      "notes:export-notes-markdown",
    );
    const dialogImportHandler = getHandlerSource(
      ipcSource,
      "notes:import-markdown-files",
    );
    const dropImportHandler = getHandlerSource(
      ipcSource,
      "notes:import-dropped-markdown-files",
    );

    expect(ipcSource).toContain('from "../store/markdownFiles"');
    expect(singleExportHandler).toBeTruthy();
    expect(singleExportHandler).toContain("assertMainWindow");
    expect(singleExportHandler).toContain('typeof noteId !== "string"');
    expect(singleExportHandler).toContain("exportNoteMarkdownFile(window, noteId)");
    expect(batchExportHandler).toBeTruthy();
    expect(batchExportHandler).toContain("assertMainWindow");
    expect(batchExportHandler).toContain("Array.isArray(noteIds)");
    expect(batchExportHandler).toContain("exportNotesMarkdownFiles(window, noteIds)");
    expect(dialogImportHandler).toBeTruthy();
    expect(dialogImportHandler).toContain("assertMainWindow");
    expect(dialogImportHandler).toContain('typeof fallbackTitle !== "string"');
    expect(dialogImportHandler).toContain(
      "importMarkdownFilesFromDialog(window, fallbackTitle)",
    );
    expect(dropImportHandler).toBeTruthy();
    expect(dropImportHandler).toContain("assertMainWindow");
    expect(dropImportHandler).toContain("Array.isArray(filePaths)");
    expect(dropImportHandler).toContain("filePaths.every");
    expect(dropImportHandler).toContain(
      "importDroppedMarkdownFiles(filePaths, fallbackTitle)",
    );
  });

  it("注册剪贴板写入 IPC 并校验消息来源与 payload 类型", () => {
    const ipcSource = readFileSync(resolve("src/main/ipc/registerIpc.ts"), "utf8");
    const clipboardHandler = ipcSource.match(
      /ipcMain\.handle\("clipboard:write"[\s\S]*?\n  \}\);/,
    )?.[0];

    expect(ipcSource).toContain("clipboard");
    expect(ipcSource).toMatch(
      /import\s*\{[\s\S]*?clipboard[\s\S]*?\}\s*from\s*"electron"/,
    );
    expect(clipboardHandler).toBeTruthy();
    expect(clipboardHandler).toContain("assertMainWindow");
    expect(clipboardHandler).toContain("BrowserWindow.fromWebContents");
    expect(clipboardHandler).toContain('typeof text !== "string"');
    expect(clipboardHandler).toContain("clipboard.writeText(text)");
    expect(clipboardHandler?.indexOf('typeof text !== "string"')).toBeLessThan(
      clipboardHandler?.indexOf("clipboard.writeText(text)") ?? -1,
    );
  });

  it("开机自启动 IPC 保存前校验布尔 payload", () => {
    const ipcSource = readFileSync(resolve("src/main/ipc/registerIpc.ts"), "utf8");
    const startupSource = readFileSync(
      resolve("src/main/startup/loginItems.ts"),
      "utf8",
    );
    const startupHandler = ipcSource.match(
      /ipcMain\.handle\("app:set-startup"[\s\S]*?\n  \}\);/,
    )?.[0];

    expect(startupHandler).toBeTruthy();
    expect(startupHandler).toContain('typeof enabled !== "boolean"');
    expect(startupHandler).toContain('throw new Error("Invalid startup payload")');
    expect(startupHandler?.indexOf('typeof enabled !== "boolean"')).toBeLessThan(
      startupHandler?.indexOf("setStartup(app, enabled)") ?? -1,
    );
    expect(startupSource).toContain("app.setLoginItemSettings");
    expect(startupSource).toContain("app.getLoginItemSettings().openAtLogin");
  });
});
