// React 渲染层测试结构守护。
// 作用：
// 1. 确认原单体 App.test.tsx 已拆分为按职责维护的测试文件。
// 2. 锁定共享测试工具存在，避免后续把重复 mock 逻辑重新塞回单个大文件。
// 3. 保持 tests/renderer/App.test.tsx 作为入口索引式守护，而不再承载全部用例。
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("App renderer test structure", () => {
  it("按功能域拆分 App 渲染层测试文件", () => {
    const rendererTests = resolve("tests/renderer");
    const splitFiles = [
      "testUtils.ts",
      "App.core.test.tsx",
      "App.editor.test.tsx",
      "App.shell.test.tsx",
      "App.theme.test.tsx",
      "App.tags.test.tsx",
      "App.settings.test.tsx",
      "App.cards.test.tsx",
    ];

    for (const file of splitFiles) {
      expect(existsSync(resolve(rendererTests, file))).toBe(true);
    }

    const thisFile = readFileSync(
      resolve(rendererTests, "App.test.tsx"),
      "utf8",
    );
    expect(thisFile.match(/\bit\(/g) ?? []).toHaveLength(1);
    expect(thisFile.split("\n").length).toBeLessThan(80);
    expect(thisFile).not.toMatch(/^function installApi/m);
  });
});
