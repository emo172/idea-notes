// Electron 主窗口配置回归测试。
// 作用：
// 1. 锁定 ESM 项目中 electron-vite 生成 .mjs preload 产物的路径约定。
// 2. 验证本地窗口图标和 720px 最小宽度配置位于窗口创建模块。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type PackageJson = {
  type?: string;
};

describe("主进程窗口配置", () => {
  it("在 ESM 项目中指向 electron-vite 生成的 mjs preload", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve("package.json"), "utf8"),
    ) as PackageJson;
    const windowSource = readFileSync(
      resolve("src/main/window/createMainWindow.ts"),
      "utf8",
    );
    const expectedPreloadPath =
      packageJson.type === "module" ? "../preload/index.mjs" : "../preload/index.js";

    expect(windowSource).toContain(
      `preload: join(__dirname, "${expectedPreloadPath}")`,
    );
  });

  it("在 Linux 和 Windows 本地窗口中使用桌面应用图标", () => {
    const windowSource = readFileSync(
      resolve("src/main/window/createMainWindow.ts"),
      "utf8",
    );

    expect(windowSource).toContain("export const desktopWindowIconPath");
    expect(windowSource).toContain('join(__dirname, "../../build/icons/icon.png")');
    expect(windowSource).toContain('process.platform === "linux"');
    expect(windowSource).toContain('process.platform === "win32"');
    expect(windowSource).toContain("icon: desktopWindowIconPath");
    expect(windowSource).toContain("mainWindow.setIcon(desktopWindowIconPath)");
  });

  it("主窗口最小宽度与渲染层 720 窄屏契约一致", () => {
    const windowSource = readFileSync(
      resolve("src/main/window/createMainWindow.ts"),
      "utf8",
    );
    const windowOptions = windowSource.match(
      /new BrowserWindow\(\{[\s\S]*?\n  \}\);/,
    )?.[0];

    expect(windowOptions).toBeTruthy();
    expect(windowOptions).toContain("minWidth: 720");
    expect(windowOptions).not.toContain("minWidth: 960");
  });

  it("主窗口根据设置切换应用级窗口按钮和静默启动", () => {
    const windowSource = readFileSync(
      resolve("src/main/window/createMainWindow.ts"),
      "utf8",
    );

    expect(windowSource).toContain("CreateMainWindowOptions");
    expect(windowSource).toContain("settings: IdeaSettings");
    expect(windowSource).toContain("frame: !settings.appWindowControls");
    expect(windowSource).toContain(
      'titleBarStyle: settings.appWindowControls ? "hidden" : "default"',
    );
    expect(windowSource).toContain("show: !settings.silentStart");
  });
});
