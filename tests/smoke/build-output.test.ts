// 生产构建产物 smoke 测试。
// 作用：
// 1. 在不引入浏览器自动化依赖的前提下检查 Electron 构建产物完整性。
// 2. 锁定 main、preload、renderer 入口和关键 IPC/preload 契约。
// 3. 作为真实桌面 smoke 前的轻量保护，需在 `npm run build` 后运行。
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("生产构建产物 smoke", () => {
  it("包含 main、preload 和 renderer 关键入口", () => {
    const mainPath = resolve("out/main/index.js");
    const preloadPath = resolve("out/preload/index.mjs");
    const rendererHtmlPath = resolve("out/renderer/index.html");

    expect(existsSync(mainPath)).toBe(true);
    expect(existsSync(preloadPath)).toBe(true);
    expect(existsSync(rendererHtmlPath)).toBe(true);

    const mainSource = readFileSync(mainPath, "utf8");
    const preloadSource = readFileSync(preloadPath, "utf8");
    const rendererHtml = readFileSync(rendererHtmlPath, "utf8");

    expect(mainSource).toContain("../preload/index.mjs");
    expect(mainSource).toContain("notes:get-data");
    expect(mainSource).toContain("notes:save-data");
    expect(preloadSource).toContain("contextBridge.exposeInMainWorld");
    expect(preloadSource).toContain("ideaNotes");
    expect(rendererHtml).toContain('<div id="root"></div>');
    expect(rendererHtml).toMatch(/assets\/index-[^"]+\.js/);
    expect(rendererHtml).toMatch(/assets\/index-[^"]+\.css/);
  });
});
