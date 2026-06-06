// Electron 主进程入口。
// 作用：
// 1. 执行平台启动配置。
// 2. 编排 IPC 注册、主窗口创建和应用生命周期。
// 3. 保持入口文件只承担启动编排，不直接承载窗口、IPC 和平台细节。
import { app, BrowserWindow } from "electron";
import { registerIpc } from "./ipc/registerIpc";
import { configureLinuxDevelopmentStartup } from "./platform/linuxStartup";
import { createMainWindow } from "./window/createMainWindow";

configureLinuxDevelopmentStartup(app);

// 主窗口引用只保存在主进程内，用于校验 IPC 请求来源和管理窗口生命周期。
let mainWindow: BrowserWindow | null = null;

function openMainWindow(): void {
  mainWindow = createMainWindow(() => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  registerIpc(() => mainWindow);
  // 不显示默认菜单，让应用保持原型中的沉浸式自定义标题栏体验。
  app.applicationMenu = null;
  openMainWindow();

  // macOS 点击 Dock 图标时，如果没有窗口则重新创建窗口。
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) openMainWindow();
  });
});

app.on("window-all-closed", () => {
  // macOS 保持常驻，其它平台关闭最后一个窗口即退出应用。
  if (process.platform !== "darwin") app.quit();
});
