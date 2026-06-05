/** @vitest-environment jsdom */
// React 渲染层设置多语言测试。
// 作用：
// 1. 覆盖设置页语言切换和跨界面文案同步。
// 2. 锁定多语言文案文件结构和加载态文案。
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { settingsCopy } from "../../src/renderer/src/i18n";
import { BASE_TIME, RENDERER_SRC, installApi } from "./testUtils";

describe("App settings i18n", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    expect(Array.from(languageSelect.options).map((option) => option.text)).toEqual([
      "简体中文",
      "繁體中文",
      "English",
    ]);
    await user.selectOptions(languageSelect, "en");

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    expect(saved.at(-1)?.settings.language).toBe("en");
    expect(document.documentElement.lang).toBe("en");
    expect(screen.getByRole("heading", { name: "System Settings" })).toBeTruthy();
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
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    await user.click(screen.getByRole("button", { name: "系统设置" }));
    await user.selectOptions(screen.getByRole("combobox", { name: /语言/ }), "en");
    await waitFor(() => expect(api.saveData).toHaveBeenCalled());

    const settingsHead = screen
      .getByRole("heading", { name: "Settings Center" })
      .closest(".settings-head") as HTMLElement;
    await user.click(within(settingsHead).getByRole("button", { name: "Reset" }));

    const dialog = screen.getByRole("dialog", { name: "Reset all settings?" });
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Confirm" })).toBeTruthy();
  });

  it("设置加载态文案集中在多语言配置中", () => {
    expect("loadingSettings" in settingsCopy["zh-CN"]).toBe(true);
    expect("loadingSettings" in settingsCopy["zh-TW"]).toBe(true);
    expect("loadingSettings" in settingsCopy.en).toBe(true);
  });

  it("多语言文案按每种语言独立文件维护", () => {
    const i18nDir = resolve("src/renderer/src/i18n");

    expect(existsSync(resolve(RENDERER_SRC, "app/IdeaNotesApp.tsx"))).toBe(true);
    expect(existsSync(resolve(RENDERER_SRC, "App.tsx"))).toBe(false);
    expect(
      existsSync(resolve(RENDERER_SRC, "components/titlebar/TitlebarIcons.tsx")),
    ).toBe(true);
    expect(existsSync(resolve(RENDERER_SRC, "components/icons.tsx"))).toBe(false);
    expect(existsSync(resolve(RENDERER_SRC, "utils/noteDraft.ts"))).toBe(true);
    expect(existsSync(resolve(RENDERER_SRC, "utils/dateFormatting.ts"))).toBe(true);
    expect(existsSync(resolve(RENDERER_SRC, "utils/noteHelpers.ts"))).toBe(false);
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
    await user.selectOptions(screen.getByRole("combobox", { name: /语言/ }), "en");
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
    expect(screen.getByRole("button", { name: "Reset filters" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "New" }));
    expect(screen.getByRole("heading", { name: "New Note" })).toBeTruthy();
    expect(screen.getByLabelText("Title")).toBeTruthy();
    expect(screen.getByPlaceholderText("Enter title...")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await user.click(screen.getByRole("button", { name: "Tag Settings" }));
    expect(screen.getByRole("heading", { name: "Tag Settings" })).toBeTruthy();
    expect(screen.getByPlaceholderText("New tag name")).toBeTruthy();
  });
});
