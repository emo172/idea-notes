// React 渲染层测试共享工具。
// 作用：
// 1. 统一安装假的 window.ideaNotes，避免每个测试文件重复 preload mock。
// 2. 提供样式源码读取和 CSS 规则提取辅助函数，服务样式契约测试。
// 3. 集中维护 renderer 测试使用的稳定时间常量。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { vi } from "vitest";
import type {
  DesktopWindowState,
  IdeaNotesApi,
  IdeaNotesData,
} from "@shared/types";

export const BASE_TIME = Date.parse("2026-05-29T08:00:00.000Z");
export const RENDERER_SRC = resolve("src/renderer/src");

export function installApi(data: IdeaNotesData): {
  api: IdeaNotesApi;
  saved: IdeaNotesData[];
} {
  // 渲染层测试用假的 preload API 代替 Electron，仍然验证真实 React 交互。
  const saved: IdeaNotesData[] = [];
  const windowState: DesktopWindowState = {
    isAlwaysOnTop: false,
    isMaximized: false,
  };
  const api: IdeaNotesApi = {
    getData: vi.fn(async () => data),
    saveData: vi.fn(async (nextData) => {
      saved.push(nextData);
      return nextData;
    }),
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
  };

  Object.defineProperty(window, "ideaNotes", {
    configurable: true,
    value: api,
  });

  return { api, saved };
}

export function readRendererStyles(): string {
  const styleFiles = [
    "styles.css",
    "styles/base.css",
    "styles/buttons.css",
    "styles/dropdown.css",
    "styles/layout.css",
    "styles/sidebar.css",
    "styles/toolbar.css",
    "styles/notes.css",
    "styles/dialogs.css",
    "styles/editor.css",
    "styles/settings.css",
  ];

  return styleFiles
    .map((file) => readFileSync(resolve(RENDERER_SRC, file), "utf8"))
    .join("\n");
}

export function readCssRuleBlock(styles: string, selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    styles.match(new RegExp(`${escapedSelector}\\s*\\{[^}]*\\}`))?.[0] ?? ""
  );
}
