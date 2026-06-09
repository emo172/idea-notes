// 主进程托盘和窗口生命周期源码契约测试。
// 作用：
// 1. 锁定启动时读取设置并创建托盘。
// 2. 验证关闭到托盘通过窗口 close 事件隐藏窗口。
// 3. 确保托盘模块提供恢复主窗口和退出应用入口。
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("主进程托盘和窗口生命周期", () => {
  it("主进程启动时读取本地设置并传给窗口和托盘", () => {
    const mainSource = readFileSync(resolve("src/main/index.ts"), "utf8");

    expect(mainSource).toContain('from "./store"');
    expect(mainSource).toContain('from "./tray/createAppTray"');
    expect(mainSource).toContain("const data = await readData()");
    expect(mainSource).toContain("registerIpc({");
    expect(mainSource).toContain("onSettingsSaved");
    expect(mainSource).toContain("createMainWindow({");
    expect(mainSource).toContain("openMainWindow(data.settings)");
    expect(mainSource).toContain("createAppTray({");
  });

  it("关闭到托盘启用时拦截关闭事件并隐藏窗口", () => {
    const mainSource = readFileSync(resolve("src/main/index.ts"), "utf8");
    const persistenceSource = readFileSync(
      resolve("src/main/window/windowStatePersistence.ts"),
      "utf8",
    );

    expect(mainSource).toContain("minimizeToTrayOnClose");
    expect(mainSource).toContain('mainWindow.on("close"');
    expect(mainSource).toContain("windowStatePersistence.handleWindowClose");
    expect(persistenceSource).toContain("event.preventDefault()");
    expect(persistenceSource).toContain("hide()");
    expect(persistenceSource).toContain("isQuitting");
  });

  it("托盘模块提供显示主窗口和退出应用菜单", () => {
    const trayPath = resolve("src/main/tray/createAppTray.ts");

    expect(existsSync(trayPath)).toBe(true);
    const traySource = readFileSync(trayPath, "utf8");
    expect(traySource).toContain("new Tray");
    expect(traySource).toContain("trayIconPath");
    expect(traySource).toContain('join(__dirname, "../../build/icons/icon.png")');
    expect(traySource).toContain("Menu.buildFromTemplate");
    expect(traySource).toContain("显示主窗口");
    expect(traySource).toContain("退出应用");
    expect(traySource).toContain("window.show()");
    expect(traySource).toContain("app.quit()");
  });

  it("通知点击时接入通知 opener 和 pending queue", () => {
    const mainSource = readFileSync(resolve("src/main/index.ts"), "utf8");
    const openerSource = readFileSync(
      resolve("src/main/window/notificationWindowOpener.ts"),
      "utf8",
    );

    expect(mainSource).toContain("openOrFocusWindowForNotification");
    expect(mainSource).toContain("openWindow: openMainWindowFromCurrentSettings");
    expect(mainSource).toContain("pendingClicks");
    expect(openerSource).not.toContain("if (!win) return");
    expect(openerSource).toContain("pendingClicks.enqueue(noteId)");
    expect(mainSource).toMatch(
      /startReminderScheduler\(\(noteId\) => \{[\s\S]*void openOrFocusWindowForNotification\(\{[\s\S]*\}\)\.catch/,
    );
  });
});
