// Electron Linux 启动约定回归测试。
// 作用：
// 1. 锁定 Linux 本地开发脚本和桌面标识。
// 2. 确保 sandbox/GPU 开关在 app ready 前执行。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type PackageJson = {
  desktopName?: string;
  scripts?: Record<string, string>;
};

describe("Linux 开发启动约定", () => {
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
    const platformSource = readFileSync(
      resolve("src/main/platform/linuxStartup.ts"),
      "utf8",
    );

    expect(packageJson.desktopName).toBe("idea-notes.desktop");
    expect(packageJson.scripts?.dev).toContain("--class=idea-notes");
    expect(beforeAppReady).toContain("configureLinuxStartup(app)");
    expect(platformSource).toContain('app.setName("idea-notes")');
    expect(platformSource).not.toContain("app.setDesktopName");
  });

  it("在应用 ready 前禁用 Linux 开发环境 sandbox 且不使用 in-process GPU 开关", () => {
    const mainSource = readFileSync(resolve("src/main/index.ts"), "utf8");
    const appReadyIndex = mainSource.indexOf("app.whenReady()");
    const beforeAppReady = mainSource.slice(0, appReadyIndex);
    const platformSource = readFileSync(
      resolve("src/main/platform/linuxStartup.ts"),
      "utf8",
    );

    expect(platformSource).toContain('process.platform !== "linux"');
    expect(platformSource).toContain("!app.isPackaged");
    expect(appReadyIndex).toBeGreaterThan(0);
    expect(beforeAppReady).toContain("configureLinuxStartup(app)");
    for (const gpuFallback of [
      "app.disableHardwareAcceleration();",
      'app.commandLine.appendSwitch("no-sandbox");',
      'app.commandLine.appendSwitch("disable-gpu-sandbox");',
    ]) {
      expect(platformSource).toContain(gpuFallback);
    }
    expect(platformSource).not.toContain('appendSwitch("in-process-gpu")');
    expect(platformSource).not.toContain("disable-software-rasterizer");
  });

  it("在应用 ready 前为 Linux 安装包禁用不稳定的 Vulkan 和 GPU 路径", () => {
    const mainSource = readFileSync(resolve("src/main/index.ts"), "utf8");
    const appReadyIndex = mainSource.indexOf("app.whenReady()");
    const beforeAppReady = mainSource.slice(0, appReadyIndex);
    const platformSource = readFileSync(
      resolve("src/main/platform/linuxStartup.ts"),
      "utf8",
    );

    expect(appReadyIndex).toBeGreaterThan(0);
    expect(beforeAppReady).toContain("configureLinuxStartup(app)");
    expect(platformSource).toContain('app.commandLine.appendSwitch("disable-vulkan")');
    expect(platformSource).toContain('app.commandLine.appendSwitch("disable-gpu")');
    expect(platformSource).not.toContain('appendSwitch("in-process-gpu")');
  });
});
