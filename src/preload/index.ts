// Electron preload 桥接脚本。
// 作用：
// 1. 通过 contextBridge 向渲染层注入 window.ideaNotes。
// 2. 将固定的笔记数据、窗口控制和开机自启动能力映射到明确 IPC 通道。
// 3. 不暴露 ipcRenderer 本体，避免渲染层发送任意 IPC 消息。
// 4. 隔离 Electron 主进程能力和 React UI，维持清晰安全边界。
// 5. 将主进程通知点击事件包装为安全的取消订阅模式，剥离 Electron 事件对象。
import { contextBridge, ipcRenderer } from "electron";
import type { IdeaNotesApi, IdeaNotesData, ImportDataMode } from "@shared/types";

// preload 只暴露固定函数，不暴露 ipcRenderer 本体，避免 renderer 发送任意 IPC 消息。
const api: IdeaNotesApi = {
  // 剪贴板写入通过主进程 IPC 执行，renderer 不直接访问 Electron clipboard API。
  copyToClipboard: (text: string) => ipcRenderer.invoke("clipboard:write", text),
  // 笔记数据读写统一走主进程，renderer 不直接访问文件系统。
  getData: () => ipcRenderer.invoke("notes:get-data"),
  saveData: (data: IdeaNotesData) => ipcRenderer.invoke("notes:save-data", data),
  exportData: () => ipcRenderer.invoke("notes:export-data"),
  importData: (mode: ImportDataMode) => ipcRenderer.invoke("notes:import-data", mode),
  // 窗口控制动作全部封装为明确 API，便于主进程校验来源。
  getWindowState: () => ipcRenderer.invoke("window:get-state"),
  minimizeWindow: () => ipcRenderer.invoke("window:minimize"),
  toggleMaximizeWindow: () => ipcRenderer.invoke("window:toggle-maximize"),
  closeWindow: () => ipcRenderer.invoke("window:close"),
  toggleAlwaysOnTop: () => ipcRenderer.invoke("window:toggle-always-on-top"),
  // 开机自启动需要主进程调用系统集成能力。
  setStartup: (enabled: boolean) => ipcRenderer.invoke("app:set-startup", enabled),
  // renderer ready 后主动领取新窗口创建期间缓存的通知点击。
  flushPendingNotificationClicks: () =>
    ipcRenderer.invoke("notification:flush-pending-clicks"),
  // 通知点击订阅使用本地 listener 引用，确保取消订阅时移除的是同一函数引用。
  onNotificationClick: (callback) => {
    const listener = (_event: unknown, noteId: string) => callback(noteId);
    ipcRenderer.on("notification:open-note", listener);
    return () => ipcRenderer.removeListener("notification:open-note", listener);
  },
};

// 对 renderer 暴露 window.ideaNotes，作为桌面能力的唯一入口。
contextBridge.exposeInMainWorld("ideaNotes", api);
