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
  type?: string;
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
    ) as PackageJson & { scripts?: Record<string, string> };

    expect(packageJson.scripts?.dev).toBe("NO_SANDBOX=1 electron-vite dev");
  });

  it("在应用 ready 前禁用 Linux 开发环境 GPU 后备以避开本地 GPU 进程崩溃", () => {
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
      'app.commandLine.appendSwitch("disable-gpu");',
      'app.commandLine.appendSwitch("disable-software-rasterizer");',
    ]) {
      expect(beforeAppReady).toContain(gpuFallback);
    }
  });
});
