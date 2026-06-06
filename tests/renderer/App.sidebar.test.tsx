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
});
