// Vitest 配置回归测试。
// 作用：
// 1. 锁定测试运行只扫描主工作区源码和测试，不误扫本地隔离 worktree。
// 2. 避免 out、release、docs 等产物或本地计划目录污染 npm test 基线。
// 3. 确保自定义 exclude 追加在 Vitest 默认排除规则之后，不覆盖默认安全边界。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Vitest 配置", () => {
  it("排除本地 worktree、构建产物和本地计划目录", () => {
    const configSource = readFileSync(resolve("vitest.config.ts"), "utf8");

    expect(configSource).toContain("configDefaults");
    expect(configSource).toContain("...configDefaults.exclude");
    for (const ignoredPath of [
      ".worktrees/**",
      "out/**",
      "release/**",
      "docs/**",
      ".omo/**",
    ]) {
      expect(configSource).toContain(`"${ignoredPath}"`);
    }
  });
});
