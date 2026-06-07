// Electron 安装包配置回归测试。
// 作用：
// 1. 锁定 package.json 中跨平台安装包脚本，避免只剩目录包构建入口。
// 2. 锁定 electron-builder 的 macOS、Windows、Linux 安装包目标。
// 3. 用源码级断言覆盖打包约定，不依赖真实跨系统构建环境。
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type PackageJson = {
  desktopName?: string;
  scripts?: Record<string, string>;
};

const buildCommand =
  "electron-vite build && electron-builder --config electron-builder.yml";

describe("安装包打包配置", () => {
  it("保留目录包脚本并提供三端安装包脚本", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve("package.json"), "utf8"),
    ) as PackageJson;
    const scripts = packageJson.scripts;

    expect(scripts).toMatchObject({
      package: `${buildCommand} --dir`,
      "package:mac": `${buildCommand} --mac`,
      "package:win": `${buildCommand} --win`,
      "package:linux": `${buildCommand} --linux`,
      "package:all": `${buildCommand} --mac --win --linux`,
    });
  });

  it("安装依赖后下载 Electron 二进制", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve("package.json"), "utf8"),
    ) as PackageJson;

    expect(packageJson.scripts).toMatchObject({
      postinstall: "install-electron",
    });
  });

  it("配置 macOS、Windows 和 Linux 安装包目标", () => {
    const builderConfig = readFileSync(resolve("electron-builder.yml"), "utf8");

    for (const targetConfig of [
      "linux:",
      "- AppImage",
      "- deb",
      "win:",
      "target: nsis",
      "mac:",
      "- dmg",
    ]) {
      expect(builderConfig).toContain(targetConfig);
    }
  });

  it("配置安装后的系统图标入口", () => {
    const builderConfig = readFileSync(resolve("electron-builder.yml"), "utf8");

    for (const shortcutConfig of [
      "createDesktopShortcut: true",
      "createStartMenuShortcut: true",
      "shortcutName: 灵感笔记",
      "Name: 灵感笔记",
      "Comment: 本地管理灵感、笔记、标签和清单",
      "Categories: Office;Productivity;",
    ]) {
      expect(builderConfig).toContain(shortcutConfig);
    }
  });

  it("使用 build/icons 目录中的桌面应用图标", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve("package.json"), "utf8"),
    ) as PackageJson;
    const builderConfig = readFileSync(resolve("electron-builder.yml"), "utf8");
    const installDevDesktopSource = readFileSync(
      resolve("scripts/install-dev-desktop.sh"),
      "utf8",
    );

    expect(packageJson.desktopName).toBe("idea-notes.desktop");
    expect(builderConfig).toContain("buildResources: build");
    expect(builderConfig).toContain("icon: build/icons/icon.png");
    expect(builderConfig).toContain("desktop:");
    expect(builderConfig).toContain("entry:");
    expect(builderConfig).toContain("StartupWMClass: idea-notes");
    expect(existsSync(resolve("build/icons/icon.png"))).toBe(true);
    expect(installDevDesktopSource).toContain("StartupWMClass=idea-notes");
    expect(installDevDesktopSource).toContain("Icon=${ICON_PATH}");
  });

  it("把运行时窗口图标打入应用包", () => {
    const builderConfig = readFileSync(resolve("electron-builder.yml"), "utf8");

    expect(builderConfig).toContain("build/icons/icon.png");
    expect(builderConfig).toContain("- build/icons/icon.png");
  });
});
