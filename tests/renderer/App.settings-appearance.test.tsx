/** @vitest-environment jsdom */
// React 渲染层设置外观测试。
// 作用：
// 1. 覆盖设置中心外观页签和已移除的背景颜色设置契约。
// 2. 验证设置页保存失败提示和确认弹窗样式位置。
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultSettings, getDefaultData } from "@shared/defaultData";
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

describe("App settings appearance", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("设置中心使用外观和系统页签且不显示背景颜色设置", async () => {
    expect(defaultSettings).not.toHaveProperty("backgroundColor");
    expect(getDefaultData(BASE_TIME).settings).not.toHaveProperty("backgroundColor");
    installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    expect(screen.getByRole("heading", { name: "外观设置" })).toBeTruthy();
    expect(screen.getByText("设置界面的默认明暗显示方式")).toBeTruthy();
    expect(screen.queryByText("背景颜色")).toBeNull();
    expect(screen.queryByText("统一调整笔记页、设置页和面板背景")).toBeNull();
    expect(document.querySelector('.settings-card input[type="color"]')).toBeNull();

    await user.click(screen.getByRole("button", { name: "系统设置" }));
    expect(screen.getByRole("heading", { name: "系统设置" })).toBeTruthy();
    expect(screen.getByText("系统登录后自动启动 Idea Notes")).toBeTruthy();
    expect(screen.getByText("到期后自动清理回收站中的笔记")).toBeTruthy();
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

    expect(resetSignature).toEqual(getConfirmDialogButtonSignature(clearTrashDialog));
  });
});
