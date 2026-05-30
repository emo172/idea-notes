// 渲染层全局类型声明。
// 作用：
// 1. 告诉 TypeScript 可以导入 CSS 文件作为副作用样式。
// 2. 声明 preload 注入的 window.ideaNotes API。
// 3. 让 React 组件调用桌面能力时获得完整类型检查。
import type { IdeaNotesApi } from "@shared/types";

// 允许 TypeScript 识别样式文件的副作用导入。
declare module "*.css";

declare global {
  interface Window {
    // preload 注入的桌面 API，renderer 只能通过它访问 Electron 能力。
    ideaNotes: IdeaNotesApi;
  }
}

export {};
