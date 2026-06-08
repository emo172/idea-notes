// 应用托盘集成模块。
// 作用：
// 1. 创建系统托盘图标和右键菜单。
// 2. 提供从托盘恢复主窗口的统一入口。
// 3. 将退出应用的托盘菜单动作保留在主进程边界内。
import { Menu, Tray, type App, type BrowserWindow } from "electron";
import { join } from "node:path";

export const trayIconPath = join(__dirname, "../../build/icons/icon.png");

interface CreateAppTrayOptions {
  app: App;
  getWindow: () => BrowserWindow | null;
  onQuit: () => void;
}

function showWindow(window: BrowserWindow): void {
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
}

export function createAppTray({
  app,
  getWindow,
  onQuit,
}: CreateAppTrayOptions): Tray | null {
  const tray = new Tray(trayIconPath);

  const showMainWindow = (): void => {
    const window = getWindow();
    if (window) showWindow(window);
  };

  tray.setToolTip("灵感笔记");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "显示主窗口", click: showMainWindow },
      {
        label: "退出应用",
        click: () => {
          onQuit();
          app.quit();
        },
      },
    ]),
  );
  tray.on("click", showMainWindow);

  return tray;
}
