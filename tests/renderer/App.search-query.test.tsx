/** @vitest-environment jsdom */
// React 渲染层搜索语法测试。
// 作用：
// 1. 覆盖搜索框对标签、优先级和截止状态语法的解析。
// 2. 验证标签名仍可作为普通搜索词匹配。
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { BASE_TIME, installApi } from "./testUtils";

describe("App search query", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("搜索框支持标签、优先级和截止状态语法并兼容标签名普通搜索", async () => {
    vi.spyOn(Date, "now").mockReturnValue(BASE_TIME);
    const data = getDefaultData(BASE_TIME);
    data.notes = [
      {
        ...data.notes[0],
        id: "search-overdue-work",
        title: "桌面窗口实现",
        body: "Electron 主进程",
        priority: "high",
        tags: ["工作"],
        dueAt: "2026-05-28T18:00",
        updatedAt: BASE_TIME + 20,
      },
      {
        ...data.notes[1],
        id: "search-reading-note",
        title: "书单整理",
        body: "本周阅读计划",
        priority: "medium",
        tags: ["阅读"],
        dueAt: "2026-05-30T18:00",
        updatedAt: BASE_TIME + 40,
      },
      {
        ...data.notes[1],
        id: "search-other-work",
        title: "工作复盘",
        body: "窗口体验回顾",
        priority: "low",
        tags: ["工作"],
        dueAt: "2026-05-30T18:00",
        updatedAt: BASE_TIME + 60,
      },
    ];
    installApi(data);
    const user = userEvent.setup();

    render(<App />);

    const searchInput = await screen.findByLabelText("搜索");
    await user.type(searchInput, "窗口 tag:工作 priority:high due:overdue");

    expect(
      await screen.findByText(
        (_, element) =>
          element?.classList.contains("note-title") === true &&
          element.textContent === "桌面窗口实现",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("书单整理")).toBeNull();
    expect(screen.queryByText("工作复盘")).toBeNull();

    await user.clear(searchInput);
    await user.type(searchInput, "阅读");

    expect(await screen.findByText("书单整理")).toBeTruthy();
    expect(screen.queryByText("桌面窗口实现")).toBeNull();
  });
});
