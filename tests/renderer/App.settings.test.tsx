/** @vitest-environment jsdom */
// React 渲染层测试。
// 作用：
// 1. 使用 jsdom 模拟浏览器环境，避免启动真实 Electron 窗口。
// 2. 用假的 window.ideaNotes 验证 App 会从 preload API 加载数据。
// 3. 按功能域拆分测试，避免单个文件过大。
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultSettings, getDefaultData } from "@shared/defaultData";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { settingsCopy } from "../../src/renderer/src/i18n";
import { BASE_TIME, RENDERER_SRC, installApi } from "./testUtils";

describe("App settings and i18n", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("设置中心使用外观和系统页签且不显示背景颜色设置", async () => {
    installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    expect(screen.getByRole("heading", { name: "外观设置" })).toBeTruthy();
    expect(screen.getByText("设置界面的默认明暗显示方式")).toBeTruthy();
    expect(screen.queryByText("背景颜色")).toBeNull();
    expect(screen.queryByText("统一调整笔记页、设置页和面板背景")).toBeNull();
    expect(
      document.querySelector('.settings-card input[type="color"]'),
    ).toBeNull();

    await user.click(screen.getByRole("button", { name: "系统设置" }));
    expect(screen.getByRole("heading", { name: "系统设置" })).toBeTruthy();
    expect(screen.getByText("系统登录后自动启动 Idea Notes")).toBeTruthy();
    expect(screen.getByText("到期后自动清理回收站中的笔记")).toBeTruthy();
  });

  it("语言设置会立即切换设置页文案并持久化", async () => {
    const { api, saved } = installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    await user.click(screen.getByRole("button", { name: "系统设置" }));
    const languageSelect = screen.getByRole("combobox", {
      name: /语言/,
    }) as HTMLSelectElement;
    expect(
      Array.from(languageSelect.options).map((option) => option.text),
    ).toEqual(["简体中文", "繁體中文", "English"]);
    await user.selectOptions(languageSelect, "en");

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    expect(saved.at(-1)?.settings.language).toBe("en");
    expect(document.documentElement.lang).toBe("en");
    expect(
      screen.getByRole("heading", { name: "System Settings" }),
    ).toBeTruthy();
    const updatedLanguageSelect = screen.getByRole("combobox", {
      name: /Language/,
    }) as HTMLSelectElement;
    expect(
      Array.from(updatedLanguageSelect.options).map((option) => option.text),
    ).toEqual(["简体中文", "繁體中文", "English"]);
    expect(screen.queryByText("Simplified Chinese")).toBeNull();
    expect(screen.queryByText("Traditional Chinese")).toBeNull();
    expect(screen.getByText("Language")).toBeTruthy();
    expect(screen.getByText("Switch the display language")).toBeTruthy();
  });

  it("语言切换后重置确认使用当前语言", async () => {
    const { api } = installApi(getDefaultData(BASE_TIME));
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    await user.click(screen.getByRole("button", { name: "系统设置" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: /语言/ }),
      "en",
    );
    await waitFor(() => expect(api.saveData).toHaveBeenCalled());

    const settingsHead = screen
      .getByRole("heading", { name: "Settings Center" })
      .closest(".settings-head") as HTMLElement;
    await user.click(
      within(settingsHead).getByRole("button", { name: "Reset" }),
    );

    expect(confirmSpy).toHaveBeenCalledWith("Reset all settings?");
  });

  it("设置加载态文案集中在多语言配置中", () => {
    expect("loadingSettings" in settingsCopy["zh-CN"]).toBe(true);
    expect("loadingSettings" in settingsCopy["zh-TW"]).toBe(true);
    expect("loadingSettings" in settingsCopy.en).toBe(true);
  });

  it("多语言文案按每种语言独立文件维护", () => {
    const i18nDir = resolve("src/renderer/src/i18n");

    expect(existsSync(resolve(RENDERER_SRC, "app/IdeaNotesApp.tsx"))).toBe(
      true,
    );
    expect(existsSync(resolve(RENDERER_SRC, "App.tsx"))).toBe(false);
    expect(
      existsSync(
        resolve(RENDERER_SRC, "components/titlebar/TitlebarIcons.tsx"),
      ),
    ).toBe(true);
    expect(existsSync(resolve(RENDERER_SRC, "components/icons.tsx"))).toBe(
      false,
    );
    expect(existsSync(resolve(RENDERER_SRC, "utils/noteDraft.ts"))).toBe(true);
    expect(existsSync(resolve(RENDERER_SRC, "utils/dateFormatting.ts"))).toBe(
      true,
    );
    expect(existsSync(resolve(RENDERER_SRC, "utils/noteHelpers.ts"))).toBe(
      false,
    );
    expect(existsSync(resolve(i18nDir, "zh-CN.ts"))).toBe(true);
    expect(existsSync(resolve(i18nDir, "zh-TW.ts"))).toBe(true);
    expect(existsSync(resolve(i18nDir, "en.ts"))).toBe(true);
    expect(existsSync(resolve(i18nDir, "copy.ts"))).toBe(false);
  });

  it("语言设置会同步标题栏、侧栏、工具栏、编辑器和标签设置文案", async () => {
    const { api } = installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    await user.click(screen.getByRole("button", { name: "系统设置" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: /语言/ }),
      "en",
    );
    await waitFor(() => expect(api.saveData).toHaveBeenCalled());

    expect(screen.getByRole("button", { name: "Pin" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Settings" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("button", { name: /In Progress/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Completed/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Trash/ })).toBeTruthy();
    expect(screen.getByText("Tag Filter")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tag Settings" })).toBeTruthy();
    expect(screen.getByText("Search")).toBeTruthy();
    expect(screen.getByPlaceholderText("Search title or body")).toBeTruthy();
    expect(screen.getByText("Priority")).toBeTruthy();
    expect(screen.getByText("Sort")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reset" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "New" }));
    expect(screen.getByRole("heading", { name: "New Note" })).toBeTruthy();
    expect(screen.getByLabelText("Title")).toBeTruthy();
    expect(screen.getByPlaceholderText("Enter title...")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Back" }));

    await user.click(screen.getByRole("button", { name: "Tag Settings" }));
    expect(screen.getByRole("heading", { name: "Tag Settings" })).toBeTruthy();
    expect(screen.getByPlaceholderText("New tag name")).toBeTruthy();
  });

  it("开机自启动使用开关并保存主进程返回值", async () => {
    const data = getDefaultData(BASE_TIME);
    data.settings.startup = false;
    const { api, saved } = installApi(data);
    api.setStartup = vi.fn(async () => false);
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    await user.click(screen.getByRole("button", { name: "系统设置" }));
    const startupSwitch = screen.getByRole("checkbox", { name: /启动行为/ });

    expect(startupSwitch.closest(".switch")).toBeTruthy();
    await user.click(startupSwitch);

    await waitFor(() => expect(api.setStartup).toHaveBeenCalledWith(true));
    expect(saved.at(-1)?.settings.startup).toBe(false);
  });
});
