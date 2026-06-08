// Electron 主进程 IPC 契约回归测试。
// 作用：
// 1. 锁定 IPC handler 仍校验消息来源。
// 2. 验证保存数据前运行时校验和开机自启动 payload 校验仍存在。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("主进程 IPC 契约", () => {
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

    // 提取 startReminderScheduler 回调块，锁定窗口恢复→显示→聚焦→推送契约
    const schedulerBlock = mainSource.match(
      /startReminderScheduler\(\(noteId\) => \{[\s\S]*?\}\);/,
    )?.[0];
    expect(schedulerBlock).toBeTruthy();

    expect(schedulerBlock).toContain("const win = mainWindow");
    expect(schedulerBlock).toContain("if (!win) return");
    expect(schedulerBlock).toContain("win.isMinimized()");
    expect(schedulerBlock).toContain("win.restore()");
    expect(schedulerBlock).toContain("win.show()");
    expect(schedulerBlock).toContain("win.focus()");
    expect(schedulerBlock).toContain(
      'webContents.send("notification:open-note", noteId)',
    );

    // 主入口不应注册 ipcMain handler（这是 main→renderer push，不是 handle）
    expect(mainSource).not.toContain('ipcMain.handle("notification:open-note")');
  });

  it("IPC 注册文件不含通知通道的 handle", () => {
    const ipcSource = readFileSync(resolve("src/main/ipc/registerIpc.ts"), "utf8");
    expect(ipcSource).not.toContain("notification:open-note");
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
