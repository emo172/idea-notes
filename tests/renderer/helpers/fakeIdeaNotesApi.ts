// 渲染层 fake preload API。
// 作用：
// 1. 统一安装假的 window.ideaNotes，避免每个测试文件重复 mock。
// 2. 让 React 测试在不启动 Electron 的情况下验证真实交互。
import { vi } from "vitest";
import type { DesktopWindowState, IdeaNotesApi, IdeaNotesData } from "@shared/types";

interface InstallApiOptions {
  getData?: IdeaNotesApi["getData"];
  windowState?: DesktopWindowState;
}

export function installApi(
  data: IdeaNotesData,
  options: InstallApiOptions = {},
): {
  api: IdeaNotesApi;
  saved: IdeaNotesData[];
} {
  const saved: IdeaNotesData[] = [];
  const windowState: DesktopWindowState = options.windowState ?? {
    isAlwaysOnTop: false,
    isMaximized: false,
  };
  const api: IdeaNotesApi = {
    getData: vi.fn(options.getData ?? (async () => data)),
    getWindowState: vi.fn(async () => windowState),
    saveData: vi.fn(async (nextData) => {
      saved.push(nextData);
      return nextData;
    }),
    exportData: vi.fn(async () => ({ ok: true })),
    importData: vi.fn(async () => ({ ok: true, data })),
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
  };

  Object.defineProperty(window, "ideaNotes", {
    configurable: true,
    value: api,
  });

  return { api, saved };
}
