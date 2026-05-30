// Electron Vite 三端构建配置。
// 作用：
// 1. 分别声明主进程、预加载脚本和 React 渲染层的构建入口与别名。
// 2. 让三端都能通过 @shared 引用同一套类型和纯业务逻辑。
// 3. 为渲染层启用 React 插件，支持 TSX 组件编译。
// 4. 保持 Electron 构建配置集中，避免 main/preload/renderer 各自维护重复路径。
import { resolve } from "node:path";
import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";

// main、preload、renderer 都会引用共享类型和纯业务逻辑，因此统一维护一个别名。
const sharedAlias = {
  "@shared": resolve("src/shared"),
};

// electron-vite 会分别构建 Electron 主进程、预加载脚本和 React 渲染层。
export default defineConfig({
  main: {
    resolve: {
      alias: sharedAlias,
    },
  },
  preload: {
    resolve: {
      alias: sharedAlias,
    },
  },
  renderer: {
    resolve: {
      alias: sharedAlias,
    },
    plugins: [react()],
  },
});
