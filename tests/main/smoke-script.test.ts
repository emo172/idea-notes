// Smoke 脚本配置测试。
// 作用：
// 1. 锁定 package.json 提供无新依赖的构建产物 smoke 命令。
// 2. 确保 CI 在生产构建后执行 smoke 检查，避免只构建不检查产物契约。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type PackageJson = {
  scripts?: Record<string, string>;
};

describe("smoke 验证脚本", () => {
  it("package.json 和 CI 在 build 后运行 smoke 检查", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve("package.json"), "utf8"),
    ) as PackageJson;
    const workflowSource = readFileSync(resolve(".github/workflows/ci.yml"), "utf8");

    expect(packageJson.scripts).toMatchObject({
      test: "vitest run --exclude tests/smoke/**",
      smoke: "vitest run tests/smoke",
      ci: "npm run typecheck && npm run lint && npm run format:check && npm test && npm run build && npm run smoke",
    });
    expect(workflowSource).toContain("npm run lint");
    expect(workflowSource).toContain("npm run format:check");
    expect(workflowSource).toContain("npm run smoke");
  });
});
