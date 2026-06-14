// 窗口位置持久化回归测试。
// 作用：
// 1. 验证离屏坐标校验函数 isPositionOnScreen 的正确性。
// 2. 锁定 createMainWindow 接受 savedBounds 参数的源码契约。
// 3. 锁定 index.ts before-quit 保存窗口 bounds 的源码契约。
// 4. 覆盖首次启动无保存数据、离屏回退和最大化恢复场景。
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getDefaultData } from "@shared/defaultData";
import type { IdeaNotesData } from "@shared/types";
import { describe, expect, it, vi } from "vitest";

interface TestWindow {
  getBounds: () => { x: number; y: number; width: number; height: number };
  isMaximized: () => boolean;
  isDestroyed: () => boolean;
  hide: () => void;
  close: () => void;
}

async function importWindowStatePersistence(): Promise<
  typeof import("../../src/main/window/windowStatePersistence")
> {
  return import("../../src/main/window/windowStatePersistence");
}

function expectPersistenceModuleExists(): void {
  expect(existsSync(resolve("src/main/window/windowStatePersistence.ts"))).toBe(true);
}

function createTestWindow(calls: string[]): TestWindow {
  return {
    getBounds: vi.fn(() => {
      calls.push("getBounds");
      return { x: 12, y: 34, width: 1024, height: 720 };
    }),
    isMaximized: vi.fn(() => false),
    isDestroyed: vi.fn(() => false),
    hide: vi.fn(() => {
      calls.push("hide");
    }),
    close: vi.fn(() => {
      calls.push("close");
    }),
  };
}

function createStoredData(): IdeaNotesData {
  return getDefaultData(Date.parse("2026-05-29T08:00:00.000Z"));
}

describe("离屏坐标校验", () => {
  // 从纯逻辑模块导入，避免测试环境加载真实 Electron 运行时。
  async function importIsPositionOnScreen(): Promise<
    (typeof import("../../src/main/window/screenBounds"))["isPositionOnScreen"]
  > {
    const mod = await import("../../src/main/window/screenBounds");
    return mod.isPositionOnScreen;
  }

  const singleDisplay = [{ workArea: { x: 0, y: 0, width: 1920, height: 1080 } }];

  it("坐标在显示器内返回 true", async () => {
    const fn = await importIsPositionOnScreen();
    expect(fn(200, 150, singleDisplay)).toBe(true);
  });

  it("坐标在原点边界返回 true", async () => {
    const fn = await importIsPositionOnScreen();
    expect(fn(0, 0, singleDisplay)).toBe(true);
  });

  it("坐标在右下角边界内返回 true", async () => {
    const fn = await importIsPositionOnScreen();
    expect(fn(1919, 1079, singleDisplay)).toBe(true);
  });

  it("x 为负数离屏返回 false", async () => {
    const fn = await importIsPositionOnScreen();
    expect(fn(-1, 100, singleDisplay)).toBe(false);
  });

  it("y 为负数离屏返回 false", async () => {
    const fn = await importIsPositionOnScreen();
    expect(fn(100, -1, singleDisplay)).toBe(false);
  });

  it("x 超出宽度返回 false", async () => {
    const fn = await importIsPositionOnScreen();
    expect(fn(1920, 100, singleDisplay)).toBe(false);
  });

  it("y 超出高度返回 false", async () => {
    const fn = await importIsPositionOnScreen();
    expect(fn(100, 1080, singleDisplay)).toBe(false);
  });

  it("坐标在很远的地方离屏返回 false", async () => {
    const fn = await importIsPositionOnScreen();
    expect(fn(-9999, -9999, singleDisplay)).toBe(false);
  });

  it("多显示器中任一包含坐标即返回 true", async () => {
    const fn = await importIsPositionOnScreen();
    const displays = [
      { workArea: { x: 0, y: 0, width: 1920, height: 1080 } },
      { workArea: { x: 1920, y: 0, width: 1680, height: 1050 } },
    ];
    // 坐标在第二个显示器内
    expect(fn(2000, 100, displays)).toBe(true);
  });

  it("坐标在多个显示器之外返回 false", async () => {
    const fn = await importIsPositionOnScreen();
    const displays = [
      { workArea: { x: 0, y: 0, width: 1920, height: 1080 } },
      { workArea: { x: 1920, y: 0, width: 1680, height: 1050 } },
    ];
    // 坐标在两个显示器右边界之外
    expect(fn(4000, 100, displays)).toBe(false);
  });
});

describe("createMainWindow savedBounds 源码契约", () => {
  const windowSource = readFileSync(
    resolve("src/main/window/createMainWindow.ts"),
    "utf8",
  );

  it("CreateMainWindowOptions 接受可选 savedBounds 参数", () => {
    expect(windowSource).toContain("savedBounds");
    expect(windowSource).toContain("CreateMainWindowOptions");
  });

  it("离屏坐标校验使用 screen API", () => {
    expect(windowSource).toContain('from "electron"');
    expect(windowSource).toContain("isPositionOnScreen");
    expect(windowSource).toContain("screen.getAllDisplays()");
  });

  it("提供 savedBounds 且未最大化时调用 setBounds 恢复位置", () => {
    expect(windowSource).toContain("setBounds");
    expect(windowSource).toContain("isMaximized");
  });

  it("提供 savedBounds 且最大化时调用 maximize", () => {
    expect(windowSource).toContain("maximize()");
  });

  it("窗口创建仍保留现有 minWidth/minHeight 和默认尺寸", () => {
    expect(windowSource).toContain("minWidth: 720");
    expect(windowSource).toContain("minHeight: 640");
    // 默认尺寸可作为后备
  });

  it("savedBounds.width/height 作为 constructor 参数传入", () => {
    // 验证 savedBounds?.width 或类似表达式出现在 BrowserWindow 构造中
    const matched = windowSource.match(/new BrowserWindow\(\{[\s\S]*?\n  \}/);
    expect(matched).toBeTruthy();
    const options = matched![0];
    // 应该在 width/height 行使用 savedBounds 或后备默认值
    expect(options).toContain("savedBounds");
  });
});

describe("getWindowState 源码契约", () => {
  const windowSource = readFileSync(
    resolve("src/main/window/createMainWindow.ts"),
    "utf8",
  );

  it("getWindowState 返回 bounds 数据", () => {
    const funcMatch = windowSource.match(/export function getWindowState[\s\S]*?\n\}/);
    expect(funcMatch).toBeTruthy();
    expect(funcMatch![0]).toContain("getBounds()");
    expect(funcMatch![0]).toContain("bounds:");
  });
});

describe("窗口 bounds 保存控制器", () => {
  it("关闭到托盘路径等待 bounds 写入完成后再隐藏窗口", async () => {
    expectPersistenceModuleExists();
    const { createWindowStatePersistence } = await importWindowStatePersistence();
    const calls: string[] = [];
    const window = createTestWindow(calls);
    const event = {
      preventDefault: vi.fn(() => {
        calls.push("preventDefault");
      }),
    };
    let resolveRead: (data: IdeaNotesData) => void = () => undefined;
    let writtenData: IdeaNotesData | undefined;
    const readData = vi.fn(
      () =>
        new Promise<IdeaNotesData>((resolve) => {
          resolveRead = resolve;
        }),
    );
    const writeData = vi.fn(async (nextData: IdeaNotesData) => {
      calls.push("write");
      writtenData = nextData;
    });
    const persistence = createWindowStatePersistence({
      getWindow: () => window,
      readData,
      writeData,
      shouldHideToTrayOnClose: () => true,
      isQuitting: () => false,
    });

    const closePromise = persistence.handleWindowClose(event, window);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(window.hide).not.toHaveBeenCalled();
    expect(window.close).not.toHaveBeenCalled();

    resolveRead(createStoredData());
    await closePromise;

    expect(writtenData?.settings.windowBounds).toEqual({
      x: 12,
      y: 34,
      width: 1024,
      height: 720,
      isMaximized: false,
    });
    expect(calls).toEqual(["preventDefault", "getBounds", "write", "hide"]);
  });

  it("普通关闭路径等待保存完成后只递归 close 一次", async () => {
    expectPersistenceModuleExists();
    const { createWindowStatePersistence } = await importWindowStatePersistence();
    const calls: string[] = [];
    const window = createTestWindow(calls);
    const firstEvent = {
      preventDefault: vi.fn(() => {
        calls.push("preventDefault:first");
      }),
    };
    const secondEvent = {
      preventDefault: vi.fn(() => {
        calls.push("preventDefault:second");
      }),
    };
    let finishWrite: () => void = () => undefined;
    const readData = vi.fn(async () => createStoredData());
    const writeData = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          calls.push("write:start");
          finishWrite = () => {
            calls.push("write:end");
            resolve();
          };
        }),
    );
    const persistence = createWindowStatePersistence({
      getWindow: () => window,
      readData,
      writeData,
      shouldHideToTrayOnClose: () => false,
      isQuitting: () => false,
    });

    const closePromise = persistence.handleWindowClose(firstEvent, window);
    await Promise.resolve();

    expect(firstEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(window.close).not.toHaveBeenCalled();

    finishWrite();
    await closePromise;
    await persistence.handleWindowClose(secondEvent, window);

    expect(window.close).toHaveBeenCalledTimes(1);
    expect(secondEvent.preventDefault).not.toHaveBeenCalled();
    expect(calls).toEqual([
      "preventDefault:first",
      "getBounds",
      "write:start",
      "write:end",
      "close",
    ]);
  });

  it("托盘退出路径保存完成后不隐藏窗口并进入真实关闭路径", async () => {
    expectPersistenceModuleExists();
    const { createWindowStatePersistence } = await importWindowStatePersistence();
    const calls: string[] = [];
    const window = createTestWindow(calls);
    const firstEvent = {
      preventDefault: vi.fn(() => {
        calls.push("preventDefault:first");
      }),
    };
    const secondEvent = {
      preventDefault: vi.fn(() => {
        calls.push("preventDefault:second");
      }),
    };
    let finishWrite: () => void = () => undefined;
    const readData = vi.fn(async () => createStoredData());
    const writeData = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          calls.push("write:start");
          finishWrite = () => {
            calls.push("write:end");
            resolve();
          };
        }),
    );
    const persistence = createWindowStatePersistence({
      getWindow: () => window,
      readData,
      writeData,
      shouldHideToTrayOnClose: () => true,
      isQuitting: () => true,
    });

    const closePromise = persistence.handleWindowClose(firstEvent, window);
    await Promise.resolve();

    expect(firstEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(window.hide).not.toHaveBeenCalled();
    expect(window.close).not.toHaveBeenCalled();

    finishWrite();
    await closePromise;
    await persistence.handleWindowClose(secondEvent, window);

    expect(window.hide).not.toHaveBeenCalled();
    expect(window.close).toHaveBeenCalledTimes(1);
    expect(secondEvent.preventDefault).not.toHaveBeenCalled();
    expect(calls).toEqual([
      "preventDefault:first",
      "getBounds",
      "write:start",
      "write:end",
      "close",
    ]);
  });

  it("before-quit 第一次阻止退出并等待保存完成后再调用 quitApp，第二次放行", async () => {
    expectPersistenceModuleExists();
    const { createWindowStatePersistence } = await importWindowStatePersistence();
    const calls: string[] = [];
    const window = createTestWindow(calls);
    const firstEvent = {
      preventDefault: vi.fn(() => {
        calls.push("preventDefault:first");
      }),
    };
    const secondEvent = {
      preventDefault: vi.fn(() => {
        calls.push("preventDefault:second");
      }),
    };
    let finishWrite: () => void = () => undefined;
    const quitApp = vi.fn(() => {
      calls.push("quitApp");
    });
    const readData = vi.fn(async () => createStoredData());
    const writeData = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          calls.push("write:start");
          finishWrite = () => {
            calls.push("write:end");
            resolve();
          };
        }),
    );
    const persistence = createWindowStatePersistence({
      getWindow: () => window,
      readData,
      writeData,
      shouldHideToTrayOnClose: () => false,
      isQuitting: () => true,
    });

    const beforeQuitPromise = persistence.handleBeforeQuit(firstEvent, quitApp);
    await Promise.resolve();

    expect(firstEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(quitApp).not.toHaveBeenCalled();

    finishWrite();
    await beforeQuitPromise;
    await persistence.handleBeforeQuit(secondEvent, quitApp);

    expect(quitApp).toHaveBeenCalledTimes(1);
    expect(secondEvent.preventDefault).not.toHaveBeenCalled();
    expect(calls).toEqual([
      "preventDefault:first",
      "getBounds",
      "write:start",
      "write:end",
      "quitApp",
    ]);
  });

  it("并发 before-quit 都阻止退出但只执行一次保存和 quitApp", async () => {
    expectPersistenceModuleExists();
    const { createWindowStatePersistence } = await importWindowStatePersistence();
    const calls: string[] = [];
    const window = createTestWindow(calls);
    const firstEvent = {
      preventDefault: vi.fn(() => {
        calls.push("preventDefault:first");
      }),
    };
    const secondEvent = {
      preventDefault: vi.fn(() => {
        calls.push("preventDefault:second");
      }),
    };
    let finishWrite: () => void = () => undefined;
    const quitApp = vi.fn(() => {
      calls.push("quitApp");
    });
    const readData = vi.fn(async () => createStoredData());
    const writeData = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          calls.push("write:start");
          finishWrite = () => {
            calls.push("write:end");
            resolve();
          };
        }),
    );
    const persistence = createWindowStatePersistence({
      getWindow: () => window,
      readData,
      writeData,
      shouldHideToTrayOnClose: () => false,
      isQuitting: () => true,
    });

    const firstBeforeQuit = persistence.handleBeforeQuit(firstEvent, quitApp);
    const secondBeforeQuit = persistence.handleBeforeQuit(secondEvent, quitApp);
    await Promise.resolve();

    expect(firstEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(secondEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(writeData).toHaveBeenCalledTimes(1);
    expect(quitApp).not.toHaveBeenCalled();

    finishWrite();
    await Promise.all([firstBeforeQuit, secondBeforeQuit]);

    expect(writeData).toHaveBeenCalledTimes(1);
    expect(quitApp).toHaveBeenCalledTimes(1);
    expect(calls).toEqual([
      "preventDefault:first",
      "getBounds",
      "preventDefault:second",
      "write:start",
      "write:end",
      "quitApp",
    ]);
  });

  it("关闭到托盘路径保存失败仍会隐藏窗口", async () => {
    expectPersistenceModuleExists();
    const { createWindowStatePersistence } = await importWindowStatePersistence();
    const calls: string[] = [];
    const window = createTestWindow(calls);
    const event = {
      preventDefault: vi.fn(() => {
        calls.push("preventDefault");
      }),
    };
    const persistence = createWindowStatePersistence({
      getWindow: () => window,
      readData: vi.fn(async () => {
        throw new Error("read failed");
      }),
      writeData: vi.fn(async () => undefined),
      shouldHideToTrayOnClose: () => true,
      isQuitting: () => false,
    });

    await persistence.handleWindowClose(event, window);

    expect(window.hide).toHaveBeenCalledTimes(1);
    expect(window.close).not.toHaveBeenCalled();
    expect(calls).toEqual(["preventDefault", "getBounds", "hide"]);
  });

  it("普通关闭路径保存失败仍会进入真实关闭路径", async () => {
    expectPersistenceModuleExists();
    const { createWindowStatePersistence } = await importWindowStatePersistence();
    const calls: string[] = [];
    const window = createTestWindow(calls);
    const firstEvent = {
      preventDefault: vi.fn(() => {
        calls.push("preventDefault:first");
      }),
    };
    const secondEvent = {
      preventDefault: vi.fn(() => {
        calls.push("preventDefault:second");
      }),
    };
    const persistence = createWindowStatePersistence({
      getWindow: () => window,
      readData: vi.fn(async () => createStoredData()),
      writeData: vi.fn(async () => {
        throw new Error("write failed");
      }),
      shouldHideToTrayOnClose: () => false,
      isQuitting: () => false,
    });

    await persistence.handleWindowClose(firstEvent, window);
    await persistence.handleWindowClose(secondEvent, window);

    expect(window.close).toHaveBeenCalledTimes(1);
    expect(secondEvent.preventDefault).not.toHaveBeenCalled();
    expect(calls).toEqual(["preventDefault:first", "getBounds", "close"]);
  });

  it("before-quit 保存失败仍会调用 quitApp 且第二次放行", async () => {
    expectPersistenceModuleExists();
    const { createWindowStatePersistence } = await importWindowStatePersistence();
    const calls: string[] = [];
    const window = createTestWindow(calls);
    const firstEvent = {
      preventDefault: vi.fn(() => {
        calls.push("preventDefault:first");
      }),
    };
    const secondEvent = {
      preventDefault: vi.fn(() => {
        calls.push("preventDefault:second");
      }),
    };
    const quitApp = vi.fn(() => {
      calls.push("quitApp");
    });
    const persistence = createWindowStatePersistence({
      getWindow: () => window,
      readData: vi.fn(async () => {
        throw new Error("read failed");
      }),
      writeData: vi.fn(async () => undefined),
      shouldHideToTrayOnClose: () => false,
      isQuitting: () => true,
    });

    await persistence.handleBeforeQuit(firstEvent, quitApp);
    await persistence.handleBeforeQuit(secondEvent, quitApp);

    expect(quitApp).toHaveBeenCalledTimes(1);
    expect(secondEvent.preventDefault).not.toHaveBeenCalled();
    expect(calls).toEqual(["preventDefault:first", "getBounds", "quitApp"]);
  });

  it("before-quit 保存后触发窗口 close 时不再次拦截关闭", async () => {
    expectPersistenceModuleExists();
    const { createWindowStatePersistence } = await importWindowStatePersistence();
    const calls: string[] = [];
    const window = createTestWindow(calls);
    const beforeQuitEvent = {
      preventDefault: vi.fn(() => {
        calls.push("preventDefault:before-quit");
      }),
    };
    const closeEvent = {
      preventDefault: vi.fn(() => {
        calls.push("preventDefault:close");
      }),
    };
    const quitApp = vi.fn(() => {
      calls.push("quitApp");
    });
    const persistence = createWindowStatePersistence({
      getWindow: () => window,
      readData: vi.fn(async () => createStoredData()),
      writeData: vi.fn(async () => {
        calls.push("write");
      }),
      shouldHideToTrayOnClose: () => false,
      isQuitting: () => true,
    });

    await persistence.handleBeforeQuit(beforeQuitEvent, quitApp);
    await persistence.handleWindowClose(closeEvent, window);

    expect(quitApp).toHaveBeenCalledTimes(1);
    expect(window.close).not.toHaveBeenCalled();
    expect(closeEvent.preventDefault).not.toHaveBeenCalled();
    expect(calls).toEqual([
      "preventDefault:before-quit",
      "getBounds",
      "write",
      "quitApp",
    ]);
  });
});

describe("index.ts before-quit 保存契约", () => {
  const mainSource = readFileSync(resolve("src/main/index.ts"), "utf8");

  it("before-quit 事件中保存窗口 bounds", () => {
    expectPersistenceModuleExists();
    const persistenceSource = readFileSync(
      resolve("src/main/window/windowStatePersistence.ts"),
      "utf8",
    );

    expect(mainSource).toContain("before-quit");
    expect(mainSource).toContain("windowStatePersistence.handleBeforeQuit");
    expect(persistenceSource).toContain("getBounds()");
    expect(persistenceSource).toContain("isMaximized()");
    expect(persistenceSource).toContain("windowBounds");
  });

  it("保存操作使用 readData + writeJsonFile 模式避免触发 saveData 流程", () => {
    // 如果使用 saveData 流程会有 purgeExpiredTrash 副作用，这里用直接读写
    expect(mainSource).toContain("writeJsonFile");
  });

  it("保存失败不中断退出流程", () => {
    expectPersistenceModuleExists();
    const persistenceSource = readFileSync(
      resolve("src/main/window/windowStatePersistence.ts"),
      "utf8",
    );

    // saveWindowBounds 函数内包含 try-catch，保证保存失败不影响退出/关闭
    expect(persistenceSource).toContain("async function saveWindowBounds");
    const saveFuncIdx = persistenceSource.indexOf("async function saveWindowBounds");
    expect(saveFuncIdx).toBeGreaterThan(-1);
    // 从函数定义位置截取到文件末尾，其中必定包含 try 和 catch
    const afterSaveFunc = persistenceSource.slice(saveFuncIdx);
    expect(afterSaveFunc).toContain("try");
    expect(afterSaveFunc).toContain("catch");
  });
});
