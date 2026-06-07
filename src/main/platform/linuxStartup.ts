// Linux 启动配置。
// 作用：
// 1. 在 Electron app ready 前设置稳定桌面标识。
// 2. 禁用容易导致 Linux 启动失败的 GPU/Vulkan 路径。
import type { App } from "electron";

export function configureLinuxStartup(app: App): void {
  if (process.platform !== "linux") return;

  app.setName("idea-notes");
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch("disable-gpu");
  app.commandLine.appendSwitch("disable-vulkan");

  // Linux 开发环境可能缺少可用 sandbox，必须在 app ready 前禁用 sandbox 相关启动路径。
  if (!app.isPackaged) {
    app.commandLine.appendSwitch("no-sandbox");
    app.commandLine.appendSwitch("disable-gpu-sandbox");
  }
}
