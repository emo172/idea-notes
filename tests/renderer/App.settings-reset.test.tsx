/** @vitest-environment jsdom */
// React 渲染层设置重置流程测试。
// 作用：
// 1. 覆盖设置重置确认、保存失败、保存中和系统状态回滚。
// 2. 验证重置流程不会依赖浏览器原生确认框。
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultSettings, getDefaultData } from "@shared/defaultData";
import type { IdeaNotesData } from "@shared/types";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { BASE_TIME, installApi } from "./testUtils";

function getConfirmDialogButtonSignature(dialog: HTMLElement): {
  actionsClassName: string;
  buttonLabels: string[];
} {
  const actions = dialog.querySelector(".confirm-actions") as HTMLElement;
  const actionButtons = within(actions).getAllByRole("button");

  return {
    actionsClassName: actions.className,
    buttonLabels: actionButtons.map((button) => button.textContent?.trim() ?? ""),
  };
}

function getSettingsResetButton(): HTMLElement {
  const settingsHead = screen
    .getByRole("heading", { name: "设置中心" })
    .closest(".settings-head") as HTMLElement;

  return within(settingsHead).getByRole("button", { name: "重置" });
}

describe("App settings reset", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    expect(dialog.classList.contains("settings-reset-confirm-panel")).toBe(true);
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
    await user.click(within(confirmDialog).getByRole("button", { name: "确认" }));

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
    await user.click(within(confirmDialog).getByRole("button", { name: "确认" }));

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
    await user.click(within(confirmDialog).getByRole("button", { name: "确认" }));

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
    await user.click(within(confirmDialog).getByRole("button", { name: "确认" }));

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
    await user.click(within(confirmDialog).getByRole("button", { name: "确认" }));

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
});
