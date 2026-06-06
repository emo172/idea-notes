// 开机自启动系统集成。
// 作用：
// 1. 封装 Electron 登录项设置。
// 2. 让 IPC handler 只负责校验 payload 和返回结果。
import type { App } from "electron";

export function setStartup(app: App, enabled: boolean): boolean {
  // 开机自启动必须在主进程调用系统 API，renderer 只传递布尔意图。
  app.setLoginItemSettings({ openAtLogin: enabled });
  return app.getLoginItemSettings().openAtLogin;
}
