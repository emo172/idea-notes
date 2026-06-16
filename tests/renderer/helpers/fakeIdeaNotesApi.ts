// 渲染层 fake preload API。
// 作用：
// 1. 统一安装假的 window.ideaNotes，避免每个测试文件重复 mock。
// 2. 让 React 测试在不启动 Electron 的情况下验证真实交互。
import { vi } from "vitest";
import type { DesktopWindowState, IdeaNotesApi, IdeaNotesData } from "@shared/types";

interface InstallApiOptions {
  getData?: IdeaNotesApi["getData"];
  windowState?: DesktopWindowState;
  pendingNotificationClicks?: string[];
}

export function installApi(
  data: IdeaNotesData,
  options: InstallApiOptions = {},
): {
  api: IdeaNotesApi;
  saved: IdeaNotesData[];
  /** 供测试手动触发通知点击回调，验证渲染层 subscribe 行为 */
  triggerNotificationClick: (noteId: string) => void;
  /** 供测试验证 unsubscribe 是否被调用 */
  getUnsubscribeCalls: () => number;
} {
  const saved: IdeaNotesData[] = [];
  const windowState: DesktopWindowState = options.windowState ?? {
    isAlwaysOnTop: false,
    isMaximized: false,
  };
  let clickCallback: ((noteId: string) => void) | null = null;
  let unsubscribeCalls = 0;

  const api: IdeaNotesApi = {
    getData: vi.fn(options.getData ?? (async () => data)),
    getWindowState: vi.fn(async () => windowState),
    saveData: vi.fn(async (nextData) => {
      saved.push(nextData);
      return nextData;
    }),
    exportData: vi.fn(async () => ({ ok: true })),
    importData: vi.fn(async () => ({ ok: true, data })),
    exportNoteMarkdown: vi.fn(async () => ({ ok: true, exportedCount: 1 })),
    exportNotesMarkdown: vi.fn(async () => ({
      ok: true,
      exportedCount: data.notes.length,
    })),
    importMarkdownFiles: vi.fn(async () => ({ ok: true, importedCount: 1, data })),
    importDroppedMarkdownFiles: vi.fn(async () => ({
      ok: true,
      importedCount: 1,
      data,
    })),
    getDroppedFilePath: vi.fn(() => ""),
    minimizeWindow: vi.fn(async () => windowState),
    toggleMaximizeWindow: vi.fn(async () => ({
      ...windowState,
      isMaximized: true,
    })),
    closeWindow: vi.fn(async () => undefined),
    toggleAlwaysOnTop: vi.fn(async () => ({
      ...windowState,
      isAlwaysOnTop: true,
    })),
    setStartup: vi.fn(async (enabled) => enabled),
    copyToClipboard: vi.fn(async () => undefined),
    flushPendingNotificationClicks: vi.fn(async () => [
      ...(options.pendingNotificationClicks ?? []),
    ]),
    onNotificationClick: vi.fn((callback: (noteId: string) => void) => {
      clickCallback = callback;
      return () => {
        clickCallback = null;
        unsubscribeCalls++;
      };
    }),
  };

  Object.defineProperty(window, "ideaNotes", {
    configurable: true,
    value: api,
  });

  return {
    api,
    saved,
    triggerNotificationClick: (noteId: string) => clickCallback?.(noteId),
    getUnsubscribeCalls: () => unsubscribeCalls,
  };
}
