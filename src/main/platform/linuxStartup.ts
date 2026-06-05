// Linux 开发启动配置。
// 作用：
// 1. 在 Electron app ready 前设置稳定桌面标识。
// 2. 本地开发环境禁用容易导致启动失败的 sandbox/GPU 路径。
import type { App } from "electron";

export function configureLinuxDevelopmentStartup(app: App): void {
  if (process.platform !== "linux") return;

  app.setName("idea-notes");

  // Linux 开发环境可能无法启动 GPU 进程，必须在 app ready 前禁用 sandbox/GPU 相关启动路径。
  if (!app.isPackaged) {
    app.disableHardwareAcceleration();
    app.commandLine.appendSwitch("no-sandbox");
    app.commandLine.appendSwitch("disable-gpu-sandbox");
  }
}
