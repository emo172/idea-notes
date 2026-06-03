// Electron 主进程入口与开发启动约定回归测试。
// 作用：
// 1. 锁定 ESM 项目中 electron-vite 生成 .mjs preload 产物的路径约定。
// 2. 避免主进程再次指向不存在的 .js preload 文件，导致 renderer 无法获得 window.ideaNotes。
// 3. 锁定 Linux 本地开发脚本、sandbox 和 GPU 启动开关，提前暴露白屏或崩溃根因。
// 4. 用源码级断言覆盖主进程启动约定，不需要启动真实 Electron 窗口。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type PackageJson = {
  desktopName?: string;
  type?: string;
  scripts?: Record<string, string>;
};

describe("主进程 preload 路径", () => {
  it("在 ESM 项目中指向 electron-vite 生成的 mjs preload", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve("package.json"), "utf8"),
    ) as PackageJson;
    const mainSource = readFileSync(resolve("src/main/index.ts"), "utf8");
    const expectedPreloadPath =
      packageJson.type === "module"
        ? "../preload/index.mjs"
        : "../preload/index.js";

    expect(mainSource).toContain(
      `preload: join(__dirname, "${expectedPreloadPath}")`,
    );
  });

  it("本地开发脚本在 Electron 启动前禁用 Linux sandbox", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve("package.json"), "utf8"),
    ) as PackageJson;

    expect(packageJson.scripts?.dev).toBe(
      "NO_SANDBOX=1 electron-vite dev -- --class=idea-notes",
    );
  });

  it("为 Linux 开发窗口声明稳定桌面标识", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve("package.json"), "utf8"),
    ) as PackageJson;
    const mainSource = readFileSync(resolve("src/main/index.ts"), "utf8");
    const appReadyIndex = mainSource.indexOf("app.whenReady()");
    const beforeAppReady = mainSource.slice(0, appReadyIndex);

    expect(packageJson.desktopName).toBe("idea-notes.desktop");
    expect(packageJson.scripts?.dev).toContain("--class=idea-notes");
    expect(beforeAppReady).toContain('app.setName("idea-notes")');
    expect(beforeAppReady).not.toContain("app.setDesktopName");
  });

  it("在应用 ready 前禁用 Linux 开发环境 GPU sandbox 且不使用矛盾 GPU 开关", () => {
    const mainSource = readFileSync(resolve("src/main/index.ts"), "utf8");
    const appReadyIndex = mainSource.indexOf("app.whenReady()");
    // Electron 的 GPU/sandbox 开关必须早于 app ready，否则本地启动仍可能先崩溃。
    const beforeAppReady = mainSource.slice(0, appReadyIndex);

    expect(mainSource).toContain('process.platform === "linux"');
    expect(mainSource).toContain("!app.isPackaged");
    expect(appReadyIndex).toBeGreaterThan(0);
    for (const gpuFallback of [
      "app.disableHardwareAcceleration();",
      'app.commandLine.appendSwitch("no-sandbox");',
      'app.commandLine.appendSwitch("disable-gpu-sandbox");',
    ]) {
      expect(beforeAppReady).toContain(gpuFallback);
    }
    expect(beforeAppReady).not.toContain('appendSwitch("in-process-gpu")');
    expect(beforeAppReady).not.toContain('appendSwitch("disable-gpu")');
    expect(beforeAppReady).not.toContain("disable-software-rasterizer");
  });

  it("在 Linux 和 Windows 本地窗口中使用桌面应用图标", () => {
    const mainSource = readFileSync(resolve("src/main/index.ts"), "utf8");

    expect(mainSource).toContain("const desktopWindowIconPath");
    expect(mainSource).toContain(
      'join(__dirname, "../../build/icons/icon.png")',
    );
    expect(mainSource).toContain('process.platform === "linux"');
    expect(mainSource).toContain('process.platform === "win32"');
    expect(mainSource).toContain("icon: desktopWindowIconPath");
    expect(mainSource).toContain("mainWindow.setIcon(desktopWindowIconPath)");
  });
});
