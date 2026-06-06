// 渲染层系统主题测试工具。
// 作用：
// 1. 安装可控的 window.matchMedia fake。
// 2. 让系统暗色偏好测试能主动派发 change 事件。
import { vi } from "vitest";

type MatchMediaChangeHandler = (event: MediaQueryListEvent) => void;

export function installMatchMedia(matches: boolean): {
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  dispatchChange: (matches: boolean) => void;
} {
  let currentMatches = matches;
  const listeners = new Set<MatchMediaChangeHandler>();
  const addEventListener = vi.fn(
    (eventName: string, listener: MatchMediaChangeHandler) => {
      if (eventName === "change") listeners.add(listener);
    },
  );
  const removeEventListener = vi.fn(
    (eventName: string, listener: MatchMediaChangeHandler) => {
      if (eventName === "change") listeners.delete(listener);
    },
  );
  const mediaQueryList = {
    media: "(prefers-color-scheme: dark)",
    get matches() {
      return currentMatches;
    },
    onchange: null,
    addEventListener,
    removeEventListener,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => mediaQueryList),
  });

  return {
    addEventListener,
    removeEventListener,
    dispatchChange: (nextMatches) => {
      currentMatches = nextMatches;
      for (const listener of listeners) {
        listener({
          matches: nextMatches,
          media: mediaQueryList.media,
        } as MediaQueryListEvent);
      }
    },
  };
}
