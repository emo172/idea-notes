// 通知点击窗口恢复行为测试。
// 作用：
// 1. 验证通知点击时主窗口不存在会先重新创建窗口。
// 2. 验证通知点击会聚焦窗口并向 renderer 推送笔记 id。
// 3. 覆盖已有窗口最小化时的 restore/show/focus/send 顺序。
import { describe, expect, it, vi } from "vitest";

interface TestNotificationWindow {
  isMinimized: () => boolean;
  restore: () => void;
  show: () => void;
  focus: () => void;
  webContents: {
    send: (channel: string, noteId: string) => void;
  };
}

async function importPendingNotificationClicks(): Promise<
  typeof import("../../src/main/window/pendingNotificationClicks")
> {
  return import("../../src/main/window/pendingNotificationClicks");
}

async function importNotificationWindowOpener(): Promise<
  typeof import("../../src/main/window/notificationWindowOpener")
> {
  return import("../../src/main/window/notificationWindowOpener");
}

function createTestWindow(
  calls: string[],
  options: { minimized?: boolean } = {},
): TestNotificationWindow {
  return {
    isMinimized: vi.fn(() => Boolean(options.minimized)),
    restore: vi.fn(() => {
      calls.push("restore");
    }),
    show: vi.fn(() => {
      calls.push("show");
    }),
    focus: vi.fn(() => {
      calls.push("focus");
    }),
    webContents: {
      send: vi.fn((channel: string, noteId: string) => {
        calls.push(`${channel}:${noteId}`);
      }),
    },
  };
}

describe("通知点击窗口恢复控制器", () => {
  it("没有主窗口时先创建窗口再聚焦并转发笔记 id", async () => {
    const { openOrFocusWindowForNotification } = await importNotificationWindowOpener();
    const { createPendingNotificationClicks } = await importPendingNotificationClicks();
    const calls: string[] = [];
    const createdWindow = createTestWindow(calls);
    const pendingClicks = createPendingNotificationClicks();
    const openWindow = vi.fn(async () => {
      calls.push("openWindow");
      return createdWindow;
    });

    await openOrFocusWindowForNotification({
      noteId: "note-from-notification",
      getWindow: () => null,
      openWindow,
      pendingClicks,
    });

    expect(openWindow).toHaveBeenCalledTimes(1);
    expect(createdWindow.restore).not.toHaveBeenCalled();
    expect(createdWindow.webContents.send).not.toHaveBeenCalled();
    expect(pendingClicks.flush()).toEqual(["note-from-notification"]);
    expect(calls).toEqual(["openWindow", "show", "focus"]);
  });

  it("没有主窗口时并发通知点击只创建一个窗口并全部入队", async () => {
    const { openOrFocusWindowForNotification } = await importNotificationWindowOpener();
    const { createPendingNotificationClicks } = await importPendingNotificationClicks();
    const calls: string[] = [];
    const createdWindow = createTestWindow(calls);
    const pendingClicks = createPendingNotificationClicks();
    let resolveOpenWindow: (window: TestNotificationWindow) => void = () => undefined;
    const openWindow = vi.fn(
      () =>
        new Promise<TestNotificationWindow>((resolve) => {
          calls.push("openWindow");
          resolveOpenWindow = resolve;
        }),
    );

    const firstOpen = openOrFocusWindowForNotification({
      noteId: "first-note",
      getWindow: () => null,
      openWindow,
      pendingClicks,
    });
    const secondOpen = openOrFocusWindowForNotification({
      noteId: "second-note",
      getWindow: () => null,
      openWindow,
      pendingClicks,
    });

    await Promise.resolve();
    expect(openWindow).toHaveBeenCalledTimes(1);
    expect(pendingClicks.flush()).toEqual([]);

    resolveOpenWindow(createdWindow);
    await Promise.all([firstOpen, secondOpen]);

    expect(openWindow).toHaveBeenCalledTimes(1);
    expect(pendingClicks.flush()).toEqual(["first-note", "second-note"]);
    expect(calls).toEqual(["openWindow", "show", "focus"]);
  });

  it("已有最小化窗口时恢复窗口并转发笔记 id", async () => {
    const { openOrFocusWindowForNotification } = await importNotificationWindowOpener();
    const { createPendingNotificationClicks } = await importPendingNotificationClicks();
    const calls: string[] = [];
    const existingWindow = createTestWindow(calls, { minimized: true });
    const pendingClicks = createPendingNotificationClicks();
    const openWindow = vi.fn(async () => {
      throw new Error("不应创建新窗口");
    });

    await openOrFocusWindowForNotification({
      noteId: "existing-window-note",
      getWindow: () => existingWindow,
      openWindow,
      pendingClicks,
    });

    expect(openWindow).not.toHaveBeenCalled();
    expect(pendingClicks.flush()).toEqual([]);
    expect(calls).toEqual([
      "restore",
      "show",
      "focus",
      "notification:open-note:existing-window-note",
    ]);
  });

  it("窗口已创建但待发通知未 flush 时继续入队，flush 后恢复直接发送", async () => {
    const { openOrFocusWindowForNotification } = await importNotificationWindowOpener();
    const { createPendingNotificationClicks } = await importPendingNotificationClicks();
    const calls: string[] = [];
    const createdWindow = createTestWindow(calls);
    const pendingClicks = createPendingNotificationClicks();
    const openWindow = vi.fn(async () => {
      calls.push("openWindow");
      return createdWindow;
    });

    await openOrFocusWindowForNotification({
      noteId: "first-note",
      getWindow: () => null,
      openWindow,
      pendingClicks,
    });

    await openOrFocusWindowForNotification({
      noteId: "second-note",
      getWindow: () => createdWindow,
      openWindow,
      pendingClicks,
    });

    expect(openWindow).toHaveBeenCalledTimes(1);
    expect(createdWindow.webContents.send).not.toHaveBeenCalled();
    expect(pendingClicks.flush()).toEqual(["first-note", "second-note"]);

    await openOrFocusWindowForNotification({
      noteId: "third-note",
      getWindow: () => createdWindow,
      openWindow,
      pendingClicks,
    });

    expect(createdWindow.webContents.send).toHaveBeenCalledTimes(1);
    expect(pendingClicks.flush()).toEqual([]);
    expect(calls).toEqual([
      "openWindow",
      "show",
      "focus",
      "show",
      "focus",
      "show",
      "focus",
      "notification:open-note:third-note",
    ]);
  });

  it("待发通知队列按先进先出 flush 并清空", async () => {
    const { createPendingNotificationClicks } = await importPendingNotificationClicks();
    const pendingClicks = createPendingNotificationClicks();

    pendingClicks.enqueue("first-note");
    pendingClicks.enqueue("second-note");

    expect(pendingClicks.flush()).toEqual(["first-note", "second-note"]);
    expect(pendingClicks.flush()).toEqual([]);
  });
});
