/** @vitest-environment jsdom */
// React 渲染层概览反向筛选测试。
// 作用：
// 1. 覆盖概览统计项点击后的视图跳转。
// 2. 验证统计项可反向设置状态、优先级和标签筛选。
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { BASE_TIME, installApi } from "./testUtils";

describe("App overview", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("概览统计项可点击反向筛选到对应列表", async () => {
    const data = getDefaultData(BASE_TIME);
    data.notes = [
      {
        ...data.notes[0],
        id: "stats-high-work",
        title: "统计高优先级工作",
        status: "active",
        priority: "high",
        tags: ["工作"],
      },
      {
        ...data.notes[1],
        id: "stats-low-idea",
        title: "统计低优先级灵感",
        status: "active",
        priority: "low",
        tags: ["灵感"],
      },
      {
        ...data.notes[1],
        id: "stats-archive",
        title: "统计归档笔记",
        status: "archive",
        priority: "medium",
        tags: ["工作"],
      },
    ];
    installApi(data);
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "概览" }));
    await user.click(screen.getByRole("button", { name: "归档 1" }));
    expect(await screen.findByText("统计归档笔记")).toBeTruthy();
    expect(screen.queryByText("统计高优先级工作")).toBeNull();

    await user.click(screen.getByRole("button", { name: "概览" }));
    await user.click(screen.getByRole("button", { name: "重要 1" }));
    expect(await screen.findByText("统计高优先级工作")).toBeTruthy();
    expect(screen.queryByText("统计低优先级灵感")).toBeNull();

    await user.click(screen.getByRole("button", { name: "概览" }));
    await user.click(screen.getByRole("button", { name: "#灵感 1" }));
    expect(await screen.findByText("统计低优先级灵感")).toBeTruthy();
    expect(screen.queryByText("统计高优先级工作")).toBeNull();
  });
});
