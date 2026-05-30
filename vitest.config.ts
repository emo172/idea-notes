// Vitest 测试配置。
// 作用：
// 1. 为 tests/ 下的单元测试和渲染层测试提供统一模块解析规则。
// 2. 显式声明 @shared 到 src/shared 的别名，保持测试导入路径与业务代码一致。
// 3. 避免测试依赖 electron-vite 的运行时配置，降低测试环境耦合。
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// 测试运行时不直接复用 electron-vite 配置，所以这里显式声明 @shared 别名。
export default defineConfig({
  resolve: {
    alias: {
      "@shared": resolve(__dirname, "src/shared"),
    },
  },
});
