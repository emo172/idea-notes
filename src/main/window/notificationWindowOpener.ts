// 通知点击窗口恢复控制器。
// 作用：
// 1. 封装通知点击后的窗口创建、恢复、聚焦和 renderer 推送。
// 2. 让无窗口和已有窗口两条路径可用纯行为测试覆盖。
// 3. 避免主进程入口直接承载通知生命周期细节。
import type { BrowserWindow } from "electron";
import type { PendingNotificationClicks } from "./pendingNotificationClicks";

type NotificationWindow = Pick<
  BrowserWindow,
  "isMinimized" | "restore" | "show" | "focus"
> & {
  webContents: Pick<BrowserWindow["webContents"], "send">;
};

interface OpenOrFocusWindowForNotificationOptions {
  noteId: string;
  getWindow: () => NotificationWindow | null;
  openWindow: () => Promise<NotificationWindow>;
  pendingClicks: PendingNotificationClicks;
}

let pendingOpenWindow: Promise<NotificationWindow> | null = null;

export async function openOrFocusWindowForNotification({
  noteId,
  getWindow,
  openWindow,
  pendingClicks,
}: OpenOrFocusWindowForNotificationOptions): Promise<void> {
  const existingWindow = getWindow();
  const isJoiningPendingOpen = !existingWindow && Boolean(pendingOpenWindow);
  const window =
    existingWindow ??
    (await (pendingOpenWindow ??= openWindow().finally(() => {
      pendingOpenWindow = null;
    })));
  if (!existingWindow || pendingClicks.hasPending()) {
    pendingClicks.enqueue(noteId);
    if (isJoiningPendingOpen) return;
  }
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
  if (!existingWindow || pendingClicks.hasPending()) {
    return;
  }
  window.webContents.send("notification:open-note", noteId);
}
