/** @vitest-environment jsdom */
// React 渲染层键盘快捷键测试。
// 作用：
// 1. 覆盖 Ctrl+F 聚焦搜索框、F1/Ctrl+/ 打开快捷键帮助。
// 2. 验证 Ctrl+数字切换视图且输入焦点内不会误触发切换。
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { BASE_TIME, installApi } from "./testUtils";

describe("App keyboard shortcuts", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Ctrl+F 聚焦搜索，Ctrl+数字切换视图且输入时不误切视图", async () => {
    const data = getDefaultData(BASE_TIME);
    data.notes = [
      {
        ...data.notes[0],
        id: "active-shortcut-note",
        title: "进行中快捷键目标",
        status: "active",
      },
      {
        ...data.notes[1],
        id: "completed-shortcut-note",
        title: "已完成快捷键目标",
        status: "completed",
      },
      {
        ...data.notes[1],
        id: "archive-shortcut-note",
        title: "归档快捷键目标",
        status: "archive",
      },
      {
        ...data.notes[1],
        id: "trash-shortcut-note",
        title: "回收站快捷键目标",
        status: "trash",
        trashedAt: BASE_TIME,
      },
    ];
    installApi(data);
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText("进行中快捷键目标");
    await user.keyboard("{Control>}f{/Control}");
    const searchInput = screen.getByLabelText("搜索");
    expect(searchInput).toBe(document.activeElement);

    await user.keyboard("{Control>}2{/Control}");
    expect(screen.queryByText("已完成快捷键目标")).toBeNull();

    await user.keyboard("{Control>}1{/Control}");
    expect(await screen.findByText("进行中快捷键目标")).toBeTruthy();
    await searchInput.blur();
    await user.keyboard("{Control>}2{/Control}");
    expect(await screen.findByText("已完成快捷键目标")).toBeTruthy();
    await user.keyboard("{Control>}3{/Control}");
    expect(await screen.findByText("归档快捷键目标")).toBeTruthy();
    await user.keyboard("{Control>}4{/Control}");
    expect(await screen.findByText("回收站快捷键目标")).toBeTruthy();
  });

  it("F1 打开快捷键帮助并可用 Escape 关闭", async () => {
    installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");
    await user.keyboard("{F1}");

    expect(screen.getByRole("dialog", { name: "快捷键参考" })).toBeTruthy();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "快捷键参考" })).toBeNull();
  });

  it("输入框聚焦时 Ctrl+/ 仍打开快捷键帮助", async () => {
    installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");
    const searchInput = screen.getByLabelText("搜索");
    await user.click(searchInput);
    expect(searchInput).toBe(document.activeElement);

    await user.keyboard("{Control>}/{/Control}");

    const dialog = screen.getByRole("dialog", { name: "快捷键参考" });
    expect(within(dialog).getByRole("heading", { name: "导航" })).toBeTruthy();
  });

  it("标题栏帮助按钮打开快捷键帮助", async () => {
    installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");
    await user.click(screen.getByRole("button", { name: "快捷键参考" }));

    expect(screen.getByRole("dialog", { name: "快捷键参考" })).toBeTruthy();
  });
});
