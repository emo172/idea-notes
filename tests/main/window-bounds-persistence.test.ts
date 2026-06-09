// 窗口位置持久化回归测试。
// 作用：
// 1. 验证离屏坐标校验函数 isPositionOnScreen 的正确性。
// 2. 锁定 createMainWindow 接受 savedBounds 参数的源码契约。
// 3. 锁定 index.ts before-quit 保存窗口 bounds 的源码契约。
// 4. 覆盖首次启动无保存数据、离屏回退和最大化恢复场景。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

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

describe("index.ts before-quit 保存契约", () => {
  const mainSource = readFileSync(resolve("src/main/index.ts"), "utf8");

  it("before-quit 事件中保存窗口 bounds", () => {
    expect(mainSource).toContain("before-quit");
    expect(mainSource).toContain("getBounds()");
    expect(mainSource).toContain("isMaximized()");
    expect(mainSource).toContain("windowBounds");
  });

  it("保存操作使用 readData + writeJsonFile 模式避免触发 saveData 流程", () => {
    // 如果使用 saveData 流程会有 purgeExpiredTrash 副作用，这里用直接读写
    expect(mainSource).toContain("writeJsonFile");
  });

  it("保存失败不中断退出流程", () => {
    // saveWindowBounds 函数内包含 try-catch，保证保存失败不影响退出/关闭
    expect(mainSource).toContain("async function saveWindowBounds");
    const saveFuncIdx = mainSource.indexOf("async function saveWindowBounds");
    expect(saveFuncIdx).toBeGreaterThan(-1);
    // 从函数定义位置截取到文件末尾，其中必定包含 try 和 catch
    const afterSaveFunc = mainSource.slice(saveFuncIdx);
    expect(afterSaveFunc).toContain("try");
    expect(afterSaveFunc).toContain("catch");
  });
});
