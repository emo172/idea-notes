// 窗口状态持久化控制器。
// 作用：
// 1. 封装窗口 bounds 读取、写入和关闭路径控制。
// 2. 让关闭和隐藏到托盘路径在保存完成后再继续，避免退出时写入悬空。
// 3. 通过递归关闭标记避免保存完成后再次触发 close 事件造成循环。
import type { BrowserWindow } from "electron";
import type { IdeaNotesData } from "@shared/types";

type WindowStateWindow = Pick<
  BrowserWindow,
  "getBounds" | "isMaximized" | "isDestroyed" | "hide" | "close"
>;

interface CloseEvent {
  preventDefault: () => void;
}

interface CreateWindowStatePersistenceOptions {
  getWindow: () => WindowStateWindow | null;
  readData: () => Promise<IdeaNotesData>;
  writeData: (data: IdeaNotesData) => Promise<void>;
  shouldHideToTrayOnClose: () => boolean;
  isQuitting: () => boolean;
}

export function createWindowStatePersistence({
  getWindow,
  readData,
  writeData,
  shouldHideToTrayOnClose,
  isQuitting,
}: CreateWindowStatePersistenceOptions): {
  saveWindowBounds: (window?: WindowStateWindow | null) => Promise<void>;
  handleWindowClose: (
    event: CloseEvent,
    window?: WindowStateWindow | null,
  ) => Promise<void>;
  handleBeforeQuit: (event: CloseEvent, quitApp: () => void) => Promise<void>;
} {
  let isClosingAfterSave = false;
  let isQuittingAfterSave = false;
  let isSavingBeforeQuit = false;
  let shouldAllowCloseAfterQuitSave = false;

  async function saveWindowBounds(window = getWindow()): Promise<void> {
    try {
      if (!window || window.isDestroyed()) return;
      const bounds = window.getBounds();
      const isMaximized = window.isMaximized();
      const data = await readData();
      data.settings.windowBounds = {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized,
      };
      await writeData(data);
    } catch {
      // 保存失败不中断关闭、隐藏或退出流程。
    }
  }

  async function handleWindowClose(
    event: CloseEvent,
    window = getWindow(),
  ): Promise<void> {
    if (!window || window.isDestroyed()) return;
    if (shouldAllowCloseAfterQuitSave && isQuitting()) return;
    if (isClosingAfterSave) {
      isClosingAfterSave = false;
      return;
    }

    event.preventDefault();
    await saveWindowBounds(window);

    if (window.isDestroyed()) return;
    if (shouldHideToTrayOnClose() && !isQuitting()) {
      window.hide();
      return;
    }

    isClosingAfterSave = true;
    window.close();
  }

  async function handleBeforeQuit(
    event: CloseEvent,
    quitApp: () => void,
  ): Promise<void> {
    if (isSavingBeforeQuit) {
      event.preventDefault();
      return;
    }
    if (isQuittingAfterSave) {
      return;
    }

    isSavingBeforeQuit = true;
    event.preventDefault();
    await saveWindowBounds();
    isSavingBeforeQuit = false;
    isQuittingAfterSave = true;
    shouldAllowCloseAfterQuitSave = true;
    quitApp();
  }

  return {
    saveWindowBounds,
    handleWindowClose,
    handleBeforeQuit,
  };
}
