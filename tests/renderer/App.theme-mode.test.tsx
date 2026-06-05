/** @vitest-environment jsdom */
// React 渲染层主题模式测试。
// 作用：
// 1. 覆盖浅色、暗色和跟随系统主题的渲染规则。
// 2. 锁定旧背景色字段不会以内联样式覆盖主题 token。
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import {
  BASE_TIME,
  RENDERER_SRC,
  installApi,
  readCssRuleBlock,
  readRendererStyles,
} from "./testUtils";
import { installMatchMedia } from "./helpers/matchMedia";

describe("App theme modes", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("暗色主题通过 token 提供更深背景和完整按钮状态色", () => {
    const styles = readRendererStyles();
    const darkBlock = readCssRuleBlock(styles, ".app-window.dark");
    const darkButtonHoverBlock = readCssRuleBlock(
      styles,
      ".app-window.dark .app-button:hover,\n.app-window.dark .app-button.active",
    );
    const darkPrimaryBlock = readCssRuleBlock(
      styles,
      ".app-window.dark .app-button-variant-primary",
    );
    const darkPrimaryHoverBlock = readCssRuleBlock(
      styles,
      ".app-window.dark .app-button-variant-primary:hover",
    );

    expect(darkBlock).toContain("--bg: #050816;");
    expect(darkBlock).toContain("--surface: #0d1424;");
    expect(darkBlock).toContain("--surface-warm: #111c33;");
    expect(darkBlock).toContain("--button-bg: #121c31;");
    expect(darkBlock).toContain("--button-border: #2a3a57;");
    expect(darkBlock).toContain("--button-shadow: 0 1px 2px rgba(0, 0, 0, 0.28);");
    expect(darkBlock).toContain(
      "--button-hover-shadow: 0 10px 22px rgba(0, 0, 0, 0.34);",
    );
    expect(darkButtonHoverBlock).toContain("--button-bg: #19243b;");
    expect(darkButtonHoverBlock).toContain("--button-border: #3b4d6d;");
    expect(darkPrimaryBlock).toContain("--button-bg: #ff7a1a;");
    expect(darkPrimaryBlock).toContain("--button-border: #ff9a4d;");
    expect(darkPrimaryBlock).toContain("color: #111827;");
    expect(darkPrimaryHoverBlock).toContain("--button-bg: #ff8f3d;");
  });

  it("暗色模式默认背景不以内联样式覆盖根主题背景", async () => {
    const darkData = getDefaultData(BASE_TIME);
    darkData.settings = {
      ...darkData.settings,
      themeMode: "dark",
    };
    installApi(darkData);

    const { container } = render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");
    const appWindow = container.querySelector(".app-window.dark") as HTMLElement;
    expect(appWindow).toBeTruthy();
    expect(appWindow.style.backgroundColor).toBe("");
  });

  it("system 主题按系统暗色偏好渲染暗色根容器", async () => {
    installMatchMedia(true);
    const systemData = getDefaultData(BASE_TIME);
    systemData.settings = {
      ...systemData.settings,
      themeMode: "system",
    };
    installApi(systemData);

    const { container } = render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");
    expect(container.querySelector(".app-window")?.classList.contains("dark")).toBe(
      true,
    );
  });

  it("system 主题跟随系统偏好变化并在卸载时注销监听", async () => {
    const matchMedia = installMatchMedia(true);
    const systemData = getDefaultData(BASE_TIME);
    systemData.settings = {
      ...systemData.settings,
      themeMode: "system",
    };
    installApi(systemData);

    const { container, unmount } = render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");
    const appWindow = container.querySelector(".app-window") as HTMLElement;
    expect(appWindow.classList.contains("dark")).toBe(true);

    act(() => matchMedia.dispatchChange(false));

    await waitFor(() => expect(appWindow.classList.contains("dark")).toBe(false));
    unmount();
    expect(matchMedia.removeEventListener).toHaveBeenCalledWith(
      "change",
      matchMedia.addEventListener.mock.calls[0]?.[1],
    );
  });

  it("系统主题监听逻辑由 useSystemTheme hook 维护", () => {
    const hookPath = resolve(RENDERER_SRC, "hooks/useSystemTheme.ts");
    const appSource = readFileSync(
      resolve(RENDERER_SRC, "app/IdeaNotesApp.tsx"),
      "utf8",
    );

    expect(existsSync(hookPath)).toBe(true);
    expect(appSource).toContain(
      'import { useSystemTheme } from "../hooks/useSystemTheme";',
    );
    expect(appSource).toContain("const systemPrefersDark = useSystemTheme();");
    expect(appSource).not.toContain("window.matchMedia(darkModeQuery)");
    expect(appSource).not.toContain("setSystemPrefersDark");
  });

  it("暗色模式的笔记状态页面不使用 settings 背景内联样式", async () => {
    const darkData = getDefaultData(BASE_TIME);
    darkData.settings = {
      ...darkData.settings,
      themeMode: "dark",
    };
    darkData.notes = [
      {
        ...darkData.notes[0],
        id: "dark-active-note",
        title: "深色进行中背景",
        status: "active",
      },
      {
        ...darkData.notes[0],
        id: "dark-completed-note",
        title: "深色已完成背景",
        status: "completed",
      },
      {
        ...darkData.notes[0],
        id: "dark-trash-note",
        title: "深色回收站背景",
        status: "trash",
        trashedAt: BASE_TIME,
      },
    ];
    installApi(darkData);
    const user = userEvent.setup();

    const { container } = render(<App />);

    await screen.findByText("深色进行中背景");
    const appWindow = container.querySelector(".app-window.dark") as HTMLElement;
    expect(appWindow).toBeTruthy();
    expect(appWindow.style.backgroundColor).toBe("");

    await user.click(screen.getByRole("button", { name: /已完成/ }));
    await screen.findByText("深色已完成背景");
    expect(appWindow.style.backgroundColor).toBe("");

    await user.click(screen.getByRole("button", { name: /回收站/ }));
    await screen.findByText("深色回收站背景");
    expect(appWindow.style.backgroundColor).toBe("");
  });

  it("浅色模式也不使用旧 settings.backgroundColor 内联背景", async () => {
    const lightData = getDefaultData(BASE_TIME);
    (
      lightData.settings as typeof lightData.settings & {
        backgroundColor: string;
      }
    ).backgroundColor = "#102030";
    installApi(lightData);

    const { container } = render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");
    const appWindow = container.querySelector(".app-window") as HTMLElement;
    expect(appWindow).toBeTruthy();
    expect(appWindow.classList.contains("dark")).toBe(false);
    expect(appWindow.style.backgroundColor).toBe("");
  });
});
