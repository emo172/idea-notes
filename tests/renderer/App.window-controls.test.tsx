/** @vitest-environment jsdom */
// React 渲染层窗口控制测试。
// 作用：
// 1. 覆盖标题栏置顶、窗口状态初始化和读取失败兜底。
// 2. 锁定标题栏图标来自 Phosphor 图标库。
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { BASE_TIME, RENDERER_SRC, installApi } from "./testUtils";

describe("App window controls", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("标题栏置顶和设置按钮使用图标并保留可访问名称", async () => {
    installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");
    const pinButton = screen.getByRole("button", { name: "置顶" });
    const settingsButton = screen.getByRole("button", { name: "设置" });
    const pinIcon = pinButton.querySelector("svg");

    expect(pinIcon).toBeTruthy();
    expect(pinIcon?.classList.contains("titlebar-pin-icon-unpinned")).toBe(true);
    expect(pinButton.getAttribute("title")).toBe("置顶");
    expect(settingsButton.querySelector("svg")).toBeTruthy();
    expect(pinButton.textContent?.trim()).toBe("");
    expect(settingsButton.textContent?.trim()).toBe("");

    await user.click(pinButton);
    const pinnedButton = await screen.findByRole("button", {
      name: "取消置顶",
    });
    const pinnedIcon = pinnedButton.querySelector("svg");
    expect(pinnedButton.getAttribute("title")).toBe("取消置顶");
    expect(pinnedIcon?.classList.contains("titlebar-pin-icon-pinned")).toBe(true);
  });

  it("首次加载后使用主进程返回的窗口状态初始化标题栏按钮", async () => {
    const { api } = installApi(getDefaultData(BASE_TIME), {
      windowState: { isAlwaysOnTop: true, isMaximized: true },
    });

    render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");
    expect(api.getWindowState).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "取消置顶" }).classList).toContain(
      "active",
    );
    expect(screen.getByRole("button", { name: "还原窗口" })).toBeTruthy();
  });

  it("窗口状态读取失败时保留默认标题栏状态并继续加载数据", async () => {
    const { api } = installApi(getDefaultData(BASE_TIME));
    vi.mocked(api.getWindowState).mockRejectedValueOnce(
      new Error("window state failed"),
    );

    render(<App />);

    expect(await screen.findByText("重构 Desktop App 导航栏")).toBeTruthy();
    expect(api.getWindowState).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "置顶" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "最大化" })).toBeTruthy();
  });

  it("最小化和关闭窗口失败时显式忽略 IPC 拒绝", async () => {
    const { api } = installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();
    const unhandledRejection = vi.fn();
    vi.mocked(api.minimizeWindow).mockRejectedValueOnce(new Error("minimize failed"));
    vi.mocked(api.closeWindow).mockRejectedValueOnce(new Error("close failed"));
    process.on("unhandledRejection", unhandledRejection);

    try {
      render(<App />);

      await screen.findByText("重构 Desktop App 导航栏");
      await user.click(screen.getByRole("button", { name: "最小化" }));
      await user.click(screen.getByRole("button", { name: "关闭" }));
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(api.minimizeWindow).toHaveBeenCalledTimes(1);
      expect(api.closeWindow).toHaveBeenCalledTimes(1);
      expect(unhandledRejection).not.toHaveBeenCalled();
    } finally {
      process.off("unhandledRejection", unhandledRejection);
    }
  });

  it("标题栏图标组件从 Phosphor 图标库导入", () => {
    const packageJson = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
    const appSource = readFileSync(
      resolve(RENDERER_SRC, "app/IdeaNotesApp.tsx"),
      "utf8",
    );
    const titlebarIcons = readFileSync(
      resolve(RENDERER_SRC, "components/titlebar/TitlebarIcons.tsx"),
      "utf8",
    );

    expect(packageJson.dependencies?.["@phosphor-icons/react"]).toBeTruthy();
    expect(titlebarIcons).toContain('from "@phosphor-icons/react"');
    expect(titlebarIcons).not.toContain("<svg");
    expect(titlebarIcons).not.toContain("<path");
    expect(titlebarIcons).not.toContain("<circle");
    expect(appSource).not.toContain("☰");
    expect(appSource).not.toContain("−");
    expect(appSource).not.toContain("□");
    expect(appSource).not.toContain("▢");
    expect(appSource).not.toContain("×");
    expect(existsSync(resolve(RENDERER_SRC, "components/titlebar"))).toBe(true);
  });
});
