/** @vitest-environment jsdom */
// React 渲染层侧栏测试。
// 作用：
// 1. 覆盖侧栏收起展开交互。
// 2. 验证设置中心返回主笔记列表的导航路径。
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { BASE_TIME, installApi } from "./testUtils";

describe("App sidebar", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("按原型支持侧栏收起和展开", async () => {
    installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    const { container } = render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");
    expect(container.querySelector(".app-body.sidebar-collapsed")).toBeNull();
    const sidebarToggle = screen.getByRole("button", {
      name: "收起/展开侧栏",
    });
    expect(sidebarToggle.getAttribute("title")).toBe("收起");

    await user.click(sidebarToggle);
    expect(container.querySelector(".app-body.sidebar-collapsed")).toBeTruthy();
    expect(sidebarToggle.getAttribute("title")).toBe("展开");

    await user.click(sidebarToggle);
    expect(container.querySelector(".app-body.sidebar-collapsed")).toBeNull();
    expect(sidebarToggle.getAttribute("title")).toBe("收起");
  });

  it("设置中心支持返回笔记列表", async () => {
    installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    expect(screen.getByRole("heading", { name: "设置中心" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "返回" }));
    expect(await screen.findByText("重构 Desktop App 导航栏")).toBeTruthy();
  });

  it("侧栏显示归档入口和数量并能切换到归档视图", async () => {
    const data = getDefaultData(BASE_TIME);
    data.notes = [
      {
        ...data.notes[0],
        id: "archived-note",
        title: "已归档的路线图",
        status: "archive",
      },
      data.notes[1],
    ];
    installApi(data);
    const user = userEvent.setup();

    render(<App />);

    const archiveNavButton = await screen.findByRole("button", { name: /归档/ });
    expect(archiveNavButton.textContent).toContain("1");
    await user.click(archiveNavButton);

    expect(screen.getByRole("region", { name: "归档" })).toBeTruthy();
    expect(await screen.findByText("已归档的路线图")).toBeTruthy();
    expect(screen.queryByText("产品命名灵感")).toBeNull();
  });

  it("侧栏显示概览入口并展示统计面板", async () => {
    const data = getDefaultData(BASE_TIME);
    data.notes = [
      {
        ...data.notes[0],
        id: "overview-active-note",
        title: "概览进行中",
        status: "active",
        priority: "high",
        tags: ["工作"],
        dueAt: "2026-05-28T18:00",
      },
      {
        ...data.notes[1],
        id: "overview-completed-note",
        title: "概览已完成",
        status: "completed",
        priority: "medium",
        tags: ["灵感"],
      },
    ];
    vi.spyOn(Date, "now").mockReturnValue(BASE_TIME);
    installApi(data);
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "概览" }));

    expect(screen.getByRole("region", { name: "数据概览" })).toBeTruthy();
    expect(screen.getByText("总数")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("逾期")).toBeTruthy();
    expect(screen.getByRole("button", { name: "进行中 1" })).toBeTruthy();
  });
});
