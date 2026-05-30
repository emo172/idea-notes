// React 渲染层入口。
// 作用：
// 1. 将根组件 App 挂载到 index.html 的 #root 节点。
// 2. 引入全局样式，让渲染层获得桌面应用布局和设计 token。
// 3. 使用 React.StrictMode 在开发阶段暴露潜在副作用问题。
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/IdeaNotesApp";
import "./styles.css";

// React 渲染入口只负责挂载根组件，业务状态集中在 App 内管理。
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
