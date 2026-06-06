// 桌面窗口控制 hook。
// 作用：
// 1. 读取主进程窗口状态并维护标题栏展示状态。
// 2. 封装置顶、最小化、最大化和关闭窗口能力。
import { useEffect, useState } from "react";
import type { DesktopWindowState } from "@shared/types";

export function useWindowControls(): {
  windowState: DesktopWindowState;
  toggleAlwaysOnTop: () => Promise<void>;
  minimizeWindow: () => void;
  toggleMaximizeWindow: () => Promise<void>;
  closeWindow: () => void;
} {
  const [windowState, setWindowState] = useState<DesktopWindowState>({
    isAlwaysOnTop: false,
    isMaximized: false,
  });

  useEffect(() => {
    let mounted = true;
    void window.ideaNotes
      .getWindowState()
      .then((state) => {
        if (mounted) setWindowState(state);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  return {
    windowState,
    toggleAlwaysOnTop: async () => {
      setWindowState(await window.ideaNotes.toggleAlwaysOnTop());
    },
    minimizeWindow: () => {
      void window.ideaNotes.minimizeWindow().catch(() => undefined);
    },
    toggleMaximizeWindow: async () => {
      setWindowState(await window.ideaNotes.toggleMaximizeWindow());
    },
    closeWindow: () => {
      void window.ideaNotes.closeWindow().catch(() => undefined);
    },
  };
}
