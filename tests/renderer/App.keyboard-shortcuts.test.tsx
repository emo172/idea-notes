/** @vitest-environment jsdom */
// React 渲染层键盘快捷键测试。
// 作用：
// 1. 覆盖 Ctrl+F 聚焦搜索框。
// 2. 验证 Ctrl+数字切换视图且输入焦点内不会误触发切换。
import { render, screen } from "@testing-library/react";
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
});
