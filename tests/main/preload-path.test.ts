// Electron 主进程 preload 路径回归测试。
// 作用：
// 1. 锁定 ESM 项目中 electron-vite 生成 .mjs preload 产物的路径约定。
// 2. 避免主进程再次指向不存在的 .js preload 文件，导致 renderer 无法获得 window.ideaNotes。
// 3. 用源码级断言快速暴露白屏根因，不需要启动真实 Electron 窗口。
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
});
