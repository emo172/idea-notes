// Electron preload API 暴露测试。
// 作用：
// 1. 验证 preload 只向 renderer 暴露 window.ideaNotes 这一组固定 API。
// 2. 锁定每个 API 对应的 IPC 通道，避免 renderer 获得任意 ipcRenderer 能力。
// 3. 为新增桌面能力时的 preload 契约变更提供回归保护。
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import type { IdeaNotesApi } from "@shared/types";

const electronMock = vi.hoisted(() => ({
  exposeInMainWorld: vi.fn(),
  invoke: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
  getPathForFile: vi.fn(),
}));

vi.mock("electron", () => ({
  contextBridge: {
    exposeInMainWorld: electronMock.exposeInMainWorld,
  },
  ipcRenderer: {
    invoke: electronMock.invoke,
    on: electronMock.on,
    removeListener: electronMock.removeListener,
  },
  webUtils: {
    getPathForFile: electronMock.getPathForFile,
  },
}));

async function loadPreloadApi(): Promise<IdeaNotesApi> {
  vi.resetModules();
  await import("../../src/preload/index");
  expect(electronMock.exposeInMainWorld).toHaveBeenCalledWith(
    "ideaNotes",
    expect.any(Object),
  );
  return electronMock.exposeInMainWorld.mock.calls.at(-1)?.[1] as IdeaNotesApi;
}

describe("preload 暴露的桌面能力 API", () => {
  beforeEach(() => {
    electronMock.exposeInMainWorld.mockClear();
    electronMock.invoke.mockReset();
    electronMock.on.mockReset();
    electronMock.removeListener.mockReset();
  });

  it("只暴露固定的 ideaNotes API 方法", async () => {
    const api = await loadPreloadApi();

    expect(Object.keys(api).sort()).toEqual([
      "closeWindow",
      "copyToClipboard",
      "exportData",
      "exportNoteMarkdown",
      "exportNotesMarkdown",
      "flushPendingNotificationClicks",
      "getData",
      "getDroppedFilePath",
      "getWindowState",
      "importData",
      "importDroppedMarkdownFiles",
      "importMarkdownFiles",
      "minimizeWindow",
      "onNotificationClick",
      "saveData",
      "setStartup",
      "toggleAlwaysOnTop",
      "toggleMaximizeWindow",
    ]);
    for (const value of Object.values(api)) {
      expect(typeof value).toBe("function");
    }
  });

  it("将笔记数据读写映射到固定 IPC 通道", async () => {
    const api = await loadPreloadApi();
    const data = getDefaultData(Date.parse("2026-05-29T08:00:00.000Z"));
    electronMock.invoke.mockResolvedValueOnce(data).mockResolvedValueOnce(data);

    await expect(api.getData()).resolves.toBe(data);
    await expect(api.saveData(data)).resolves.toBe(data);

    expect(electronMock.invoke).toHaveBeenNthCalledWith(1, "notes:get-data");
    expect(electronMock.invoke).toHaveBeenNthCalledWith(2, "notes:save-data", data);
  });

  it("将数据导入导出映射到固定 IPC 通道", async () => {
    const api = await loadPreloadApi();
    const data = getDefaultData(Date.parse("2026-05-29T08:00:00.000Z"));
    electronMock.invoke
      .mockResolvedValueOnce({ ok: true, filePath: "/tmp/idea-notes.json" })
      .mockResolvedValueOnce({ ok: true, filePath: "/tmp/idea-notes.json", data });

    await expect(api.exportData()).resolves.toEqual({
      ok: true,
      filePath: "/tmp/idea-notes.json",
    });
    await expect(api.importData("merge")).resolves.toEqual({
      ok: true,
      filePath: "/tmp/idea-notes.json",
      data,
    });

    expect(electronMock.invoke).toHaveBeenNthCalledWith(1, "notes:export-data");
    expect(electronMock.invoke).toHaveBeenNthCalledWith(
      2,
      "notes:import-data",
      "merge",
    );
  });

  it("将 Markdown 文件能力映射到固定 IPC 通道", async () => {
    const api = await loadPreloadApi();
    const result = { ok: true, importedCount: 2, exportedCount: 2 };
    const droppedFile = { name: "a.md" } as File;
    electronMock.getPathForFile.mockReturnValue("/tmp/a.md");
    electronMock.invoke
      .mockResolvedValueOnce(result)
      .mockResolvedValueOnce(result)
      .mockResolvedValueOnce(result)
      .mockResolvedValueOnce(result);

    expect(api.getDroppedFilePath(droppedFile)).toBe("/tmp/a.md");
    await expect(api.exportNoteMarkdown("note-1")).resolves.toBe(result);
    await expect(api.exportNotesMarkdown(["note-1", "note-2"])).resolves.toBe(result);
    await expect(api.importMarkdownFiles("未命名笔记")).resolves.toBe(result);
    await expect(
      api.importDroppedMarkdownFiles(["/tmp/a.md"], "未命名笔记"),
    ).resolves.toBe(result);

    expect(electronMock.invoke).toHaveBeenNthCalledWith(
      1,
      "notes:export-note-markdown",
      "note-1",
    );
    expect(electronMock.getPathForFile).toHaveBeenCalledWith(droppedFile);
    expect(electronMock.invoke).toHaveBeenNthCalledWith(
      2,
      "notes:export-notes-markdown",
      ["note-1", "note-2"],
    );
    expect(electronMock.invoke).toHaveBeenNthCalledWith(
      3,
      "notes:import-markdown-files",
      "未命名笔记",
    );
    expect(electronMock.invoke).toHaveBeenNthCalledWith(
      4,
      "notes:import-dropped-markdown-files",
      ["/tmp/a.md"],
      "未命名笔记",
    );
  });

  it("将窗口和系统能力映射到固定 IPC 通道", async () => {
    const api = await loadPreloadApi();
    electronMock.invoke
      .mockResolvedValueOnce({ isAlwaysOnTop: true, isMaximized: true })
      .mockResolvedValueOnce({ isAlwaysOnTop: false, isMaximized: false })
      .mockResolvedValueOnce({ isAlwaysOnTop: false, isMaximized: true })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ isAlwaysOnTop: true, isMaximized: false })
      .mockResolvedValueOnce(true);

    await api.getWindowState();
    await api.minimizeWindow();
    await api.toggleMaximizeWindow();
    await api.closeWindow();
    await api.toggleAlwaysOnTop();
    await api.setStartup(true);

    expect(electronMock.invoke).toHaveBeenNthCalledWith(1, "window:get-state");
    expect(electronMock.invoke).toHaveBeenNthCalledWith(2, "window:minimize");
    expect(electronMock.invoke).toHaveBeenNthCalledWith(3, "window:toggle-maximize");
    expect(electronMock.invoke).toHaveBeenNthCalledWith(4, "window:close");
    expect(electronMock.invoke).toHaveBeenNthCalledWith(
      5,
      "window:toggle-always-on-top",
    );
    expect(electronMock.invoke).toHaveBeenNthCalledWith(6, "app:set-startup", true);
  });

  it("将剪贴板写入映射到固定 IPC 通道", async () => {
    const api = await loadPreloadApi();
    electronMock.invoke.mockResolvedValueOnce(undefined);

    await api.copyToClipboard!("test text");

    expect(electronMock.invoke).toHaveBeenCalledWith("clipboard:write", "test text");
  });

  it("通知点击监听器使用本地引用完成订阅和取消订阅", async () => {
    const api = await loadPreloadApi();
    expect(typeof api.onNotificationClick).toBe("function");

    const callback = vi.fn();
    const unsubscribe = api.onNotificationClick!(callback);

    // 验证 on 使用固定通道名，且传入的是函数
    expect(electronMock.on).toHaveBeenCalledTimes(1);
    expect(electronMock.on).toHaveBeenCalledWith(
      "notification:open-note",
      expect.any(Function),
    );

    // 验证返回的取消订阅函数
    expect(typeof unsubscribe).toBe("function");

    // 模拟主进程推送通知点击消息，验证 renderer 回调收到纯 noteId
    const listener = electronMock.on.mock.calls[0][1] as (
      _event: unknown,
      noteId: string,
    ) => void;
    listener({ sender: "mock-ipc" }, "target-note-id");
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("target-note-id");
    // renderer 回调不应收到 Electron 事件对象
    expect(callback.mock.calls[0]).toHaveLength(1);

    // 调用取消订阅，验证 removeListener 使用同一 listener 引用
    unsubscribe();
    expect(electronMock.removeListener).toHaveBeenCalledTimes(1);
    expect(electronMock.removeListener).toHaveBeenCalledWith(
      "notification:open-note",
      listener,
    );
  });

  it("将待发通知点击 flush 映射到固定 IPC 通道", async () => {
    const api = await loadPreloadApi();
    electronMock.invoke.mockResolvedValueOnce(["pending-note-id"]);

    await expect(api.flushPendingNotificationClicks()).resolves.toEqual([
      "pending-note-id",
    ]);

    expect(electronMock.invoke).toHaveBeenCalledWith(
      "notification:flush-pending-clicks",
    );
  });
});
