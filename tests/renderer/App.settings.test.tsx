/** @vitest-environment jsdom */
// React 渲染层测试。
// 作用：
// 1. 使用 jsdom 模拟浏览器环境，避免启动真实 Electron 窗口。
// 2. 用假的 window.ideaNotes 验证 App 会从 preload API 加载数据。
// 3. 按功能域拆分测试，避免单个文件过大。
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultSettings, getDefaultData } from "@shared/defaultData";
import type { IdeaNotesData } from "@shared/types";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { settingsCopy } from "../../src/renderer/src/i18n";
import { BASE_TIME, RENDERER_SRC, installApi } from "./testUtils";

function getConfirmDialogButtonSignature(dialog: HTMLElement): {
  actionsClassName: string;
  buttonLabels: string[];
} {
  const actions = dialog.querySelector(".confirm-actions") as HTMLElement;
  const actionButtons = within(actions).getAllByRole("button");

  return {
    actionsClassName: actions.className,
    buttonLabels: actionButtons.map(
      (button) => button.textContent?.trim() ?? "",
    ),
  };
}

function getSettingsResetButton(): HTMLElement {
  const settingsHead = screen
    .getByRole("heading", { name: "设置中心" })
    .closest(".settings-head") as HTMLElement;

  return within(settingsHead).getByRole("button", { name: "重置" });
}

describe("App settings and i18n", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("设置中心使用外观和系统页签且不显示背景颜色设置", async () => {
    expect(defaultSettings).not.toHaveProperty("backgroundColor");
    expect(getDefaultData(BASE_TIME).settings).not.toHaveProperty(
      "backgroundColor",
    );
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

  it("设置重置使用应用内确认弹窗并按通用确认弹窗样式展示按钮", async () => {
    const data = getDefaultData(BASE_TIME);
    data.settings = {
      ...defaultSettings,
      themeMode: "dark",
      startup: true,
      trashAutoDelete: "30",
    };
    const { api, saved } = installApi(data);
    api.setStartup = vi.fn(async (enabled) => enabled);
    const confirmSpy = vi.spyOn(window, "confirm");
    const resetDialogName = "确认重置所有设置？";
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));

    await user.click(getSettingsResetButton());

    const dialog = await screen.findByRole("dialog", {
      name: resetDialogName,
    });
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(dialog.classList.contains("settings-reset-confirm-panel")).toBe(
      true,
    );
    const signature = getConfirmDialogButtonSignature(dialog);
    expect(signature.actionsClassName).toBe("dialog-actions confirm-actions");
    expect(signature.buttonLabels).toEqual(["取消", "确认"]);

    await user.click(within(dialog).getByRole("button", { name: "取消" }));
    expect(screen.queryByRole("dialog", { name: resetDialogName })).toBeNull();
    expect(api.saveData).not.toHaveBeenCalled();

    await user.click(getSettingsResetButton());
    const confirmDialog = await screen.findByRole("dialog", {
      name: resetDialogName,
    });
    await user.click(
      within(confirmDialog).getByRole("button", { name: "确认" }),
    );

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    expect(api.setStartup).toHaveBeenCalledWith(defaultSettings.startup);
    expect(saved.at(-1)?.settings).toEqual(defaultSettings);
  });

  it("设置重置保存失败时保留确认弹窗和当前设置并显示错误提示", async () => {
    const data = getDefaultData(BASE_TIME);
    data.settings = {
      ...defaultSettings,
      themeMode: "dark",
      startup: true,
      trashAutoDelete: "30",
    };
    const { api } = installApi(data);
    api.setStartup = vi.fn(async () => true);
    api.saveData = vi.fn(async () => {
      throw new Error("write failed");
    });
    const resetDialogName = "确认重置所有设置？";
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    await user.click(getSettingsResetButton());
    const confirmDialog = await screen.findByRole("dialog", {
      name: resetDialogName,
    });
    await user.click(
      within(confirmDialog).getByRole("button", { name: "确认" }),
    );

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    expect(screen.getByRole("dialog", { name: resetDialogName })).toBeTruthy();
    expect(
      (
        screen.getByRole("combobox", {
          name: /主题模式/,
        }) as HTMLSelectElement
      ).value,
    ).toBe("dark");
    expect(screen.getByRole("alert").textContent).toBe(
      "保存失败，本地数据没有写入。请重试。",
    );
    expect(api.setStartup).toHaveBeenNthCalledWith(1, false);
    expect(api.setStartup).toHaveBeenNthCalledWith(2, true);
  });

  it("设置保存 pending 时禁用设置控件并阻止开机自启动副作用", async () => {
    const data = getDefaultData(BASE_TIME);
    data.settings.startup = false;
    let resolveSave: ((data: IdeaNotesData) => void) | undefined;
    const { api } = installApi(data);
    api.saveData = vi.fn(
      (_nextData) =>
        new Promise<IdeaNotesData>((resolve) => {
          resolveSave = resolve;
        }),
    );
    api.setStartup = vi.fn(async (enabled) => enabled);
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    await user.click(screen.getByRole("button", { name: "系统设置" }));
    const languageSelect = screen.getByRole("combobox", {
      name: /语言/,
    }) as HTMLSelectElement;
    await user.selectOptions(languageSelect, "en");
    await waitFor(() => expect(api.saveData).toHaveBeenCalledTimes(1));

    const startupSwitch = screen.getByRole("checkbox", {
      name: /启动行为/,
    }) as HTMLInputElement;
    expect(languageSelect.disabled).toBe(true);
    expect(startupSwitch.disabled).toBe(true);

    await user.click(startupSwitch);
    expect(api.setStartup).not.toHaveBeenCalled();
    expect(api.saveData).toHaveBeenCalledTimes(1);

    const finishSave = resolveSave;
    if (!finishSave) throw new Error("save promise was not created");
    await act(async () => {
      finishSave({
        ...data,
        settings: {
          ...data.settings,
          language: "en",
        },
      });
    });
  });

  it("设置重置保存 pending 时保留确认弹窗并禁用确认动作", async () => {
    const data = getDefaultData(BASE_TIME);
    data.settings = {
      ...defaultSettings,
      themeMode: "dark",
      startup: true,
      trashAutoDelete: "30",
    };
    let resolveSave: ((data: IdeaNotesData) => void) | undefined;
    const { api } = installApi(data);
    api.setStartup = vi.fn(async (enabled) => enabled);
    api.saveData = vi.fn(
      (nextData) =>
        new Promise<IdeaNotesData>((resolve) => {
          resolveSave = () => resolve(nextData);
        }),
    );
    const resetDialogName = "确认重置所有设置？";
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    await user.click(getSettingsResetButton());
    const confirmDialog = await screen.findByRole("dialog", {
      name: resetDialogName,
    });
    await user.click(
      within(confirmDialog).getByRole("button", { name: "确认" }),
    );

    await waitFor(() => expect(api.saveData).toHaveBeenCalledTimes(1));
    const cancelButton = within(confirmDialog).getByRole("button", {
      name: "取消",
    }) as HTMLButtonElement;
    const confirmButton = within(confirmDialog).getByRole("button", {
      name: "确认",
    }) as HTMLButtonElement;
    expect(cancelButton.disabled).toBe(true);
    expect(confirmButton.disabled).toBe(true);

    await user.keyboard("{Escape}");
    await user.click(cancelButton);
    await user.click(confirmButton);

    expect(screen.getByRole("dialog", { name: resetDialogName })).toBeTruthy();
    expect(api.saveData).toHaveBeenCalledTimes(1);

    const finishSave = resolveSave;
    if (!finishSave) throw new Error("save promise was not created");
    await act(async () => {
      finishSave({
        ...data,
        settings: defaultSettings,
      });
    });
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: resetDialogName })).toBeNull(),
    );
  });

  it("设置重置开机自启动失败时恢复可判定状态并显示错误提示", async () => {
    const data = getDefaultData(BASE_TIME);
    data.settings = {
      ...defaultSettings,
      themeMode: "dark",
      startup: true,
      trashAutoDelete: "30",
    };
    const { api, saved } = installApi(data);
    api.setStartup = vi.fn(async () => {
      throw new Error("startup failed");
    });
    const resetDialogName = "确认重置所有设置？";
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    await user.click(getSettingsResetButton());
    const confirmDialog = await screen.findByRole("dialog", {
      name: resetDialogName,
    });
    await user.click(
      within(confirmDialog).getByRole("button", { name: "确认" }),
    );

    await waitFor(() => expect(api.setStartup).toHaveBeenCalledWith(false));
    expect(api.saveData).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: resetDialogName })).toBeTruthy();
    expect(saved).toEqual([]);
    expect(screen.getByRole("alert").textContent).toBe(
      "保存失败，本地数据没有写入。请重试。",
    );
  });

  it("设置重置系统状态变更成功但本地保存失败时回滚系统状态", async () => {
    const data = getDefaultData(BASE_TIME);
    data.settings = {
      ...defaultSettings,
      themeMode: "dark",
      startup: true,
      trashAutoDelete: "30",
    };
    const { api } = installApi(data);
    api.setStartup = vi.fn(async (enabled) => enabled);
    api.saveData = vi.fn(async () => {
      throw new Error("write failed");
    });
    const resetDialogName = "确认重置所有设置？";
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    await user.click(getSettingsResetButton());
    const confirmDialog = await screen.findByRole("dialog", {
      name: resetDialogName,
    });
    await user.click(
      within(confirmDialog).getByRole("button", { name: "确认" }),
    );

    await waitFor(() => expect(api.saveData).toHaveBeenCalledTimes(1));
    expect(api.setStartup).toHaveBeenNthCalledWith(1, false);
    expect(api.setStartup).toHaveBeenNthCalledWith(2, true);
    expect(screen.getByRole("dialog", { name: resetDialogName })).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe(
      "保存失败，本地数据没有写入。请重试。",
    );
    await user.click(within(confirmDialog).getByRole("button", { name: "取消" }));
    await user.click(screen.getByRole("button", { name: "系统设置" }));
    const startupSwitch = screen.getByRole("checkbox", {
      name: /启动行为/,
    }) as HTMLInputElement;
    expect(startupSwitch.checked).toBe(true);
  });

  it("设置页保存失败提示显示在设置内容区内", async () => {
    const { api } = installApi(getDefaultData(BASE_TIME));
    api.saveData = vi.fn(async () => {
      throw new Error("write failed");
    });
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: /主题模式/ }),
      "dark",
    );

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("保存失败，本地数据没有写入。请重试。");
    expect(alert.classList.contains("settings-error-alert")).toBe(true);
    expect(alert.closest(".settings-main")).toBeTruthy();
  });

  it("开机自启动系统变更成功但保存失败时回滚系统状态", async () => {
    const data = getDefaultData(BASE_TIME);
    data.settings.startup = false;
    const { api } = installApi(data);
    api.setStartup = vi.fn(async (enabled) => enabled);
    api.saveData = vi.fn(async () => {
      throw new Error("write failed");
    });
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    await user.click(screen.getByRole("button", { name: "系统设置" }));
    const startupSwitch = screen.getByRole("checkbox", {
      name: /启动行为/,
    }) as HTMLInputElement;
    await user.click(startupSwitch);

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    expect(api.setStartup).toHaveBeenNthCalledWith(1, true);
    expect(api.setStartup).toHaveBeenNthCalledWith(2, false);
    expect(startupSwitch.checked).toBe(false);
    expect(screen.getByRole("alert").textContent).toBe(
      "保存失败，本地数据没有写入。请重试。",
    );
  });

  it("设置重置和清空回收站确认弹窗共用按钮布局和样式", async () => {
    const data = getDefaultData(BASE_TIME);
    data.notes = [
      {
        ...data.notes[0],
        id: "settings-style-trash-note",
        status: "trash",
        trashedAt: BASE_TIME,
      },
      data.notes[1],
    ];
    installApi(data);
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    await user.click(getSettingsResetButton());
    const resetDialog = await screen.findByRole("dialog", {
      name: "确认重置所有设置？",
    });
    const resetSignature = getConfirmDialogButtonSignature(resetDialog);

    await user.click(within(resetDialog).getByRole("button", { name: "取消" }));
    await user.click(screen.getByRole("button", { name: "返回" }));
    await user.click(screen.getByRole("button", { name: /回收站/ }));
    await user.click(screen.getByRole("button", { name: "清空回收站" }));
    const clearTrashDialog = await screen.findByRole("dialog", {
      name: "确认清空回收站？",
    });

    expect(resetSignature).toEqual(
      getConfirmDialogButtonSignature(clearTrashDialog),
    );
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

    const dialog = screen.getByRole("dialog", { name: "Reset all settings?" });
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeTruthy();
    expect(
      within(dialog).getByRole("button", { name: "Confirm" }),
    ).toBeTruthy();
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
