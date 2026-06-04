// Electron preload 桥接脚本。
// 作用：
// 1. 通过 contextBridge 向渲染层注入 window.ideaNotes。
// 2. 将固定的笔记数据、窗口控制和开机自启动能力映射到明确 IPC 通道。
// 3. 不暴露 ipcRenderer 本体，避免渲染层发送任意 IPC 消息。
// 4. 隔离 Electron 主进程能力和 React UI，维持清晰安全边界。
import { contextBridge, ipcRenderer } from "electron";
import type { IdeaNotesApi, IdeaNotesData } from "@shared/types";

// preload 只暴露固定函数，不暴露 ipcRenderer 本体，避免 renderer 发送任意 IPC 消息。
const api: IdeaNotesApi = {
  // 笔记数据读写统一走主进程，renderer 不直接访问文件系统。
  getData: () => ipcRenderer.invoke("notes:get-data"),
  saveData: (data: IdeaNotesData) =>
    ipcRenderer.invoke("notes:save-data", data),
  // 窗口控制动作全部封装为明确 API，便于主进程校验来源。
  getWindowState: () => ipcRenderer.invoke("window:get-state"),
  minimizeWindow: () => ipcRenderer.invoke("window:minimize"),
  toggleMaximizeWindow: () => ipcRenderer.invoke("window:toggle-maximize"),
  closeWindow: () => ipcRenderer.invoke("window:close"),
  toggleAlwaysOnTop: () => ipcRenderer.invoke("window:toggle-always-on-top"),
  // 开机自启动需要主进程调用系统集成能力。
  setStartup: (enabled: boolean) =>
    ipcRenderer.invoke("app:set-startup", enabled),
};

// 对 renderer 暴露 window.ideaNotes，作为桌面能力的唯一入口。
contextBridge.exposeInMainWorld("ideaNotes", api);
