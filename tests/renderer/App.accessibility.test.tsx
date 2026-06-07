/** @vitest-environment jsdom */
// React 渲染层可访问语义测试。
// 作用：
// 1. 锁定侧栏当前视图、标签筛选和设置页签的可访问状态。
// 2. 避免仅靠视觉 class 表示选中状态。
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { BASE_TIME, installApi } from "./testUtils";

describe("App accessibility states", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("侧栏当前视图和标签筛选暴露可访问选中状态", async () => {
    installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    const nav = await screen.findByRole("navigation", { name: "笔记视图" });
    const activeButton = within(nav).getByRole("button", { name: /进行中/ });
    expect(activeButton.getAttribute("aria-current")).toBe("page");

    const workTag = screen.getByRole("button", { name: "#工作" });
    expect(workTag.getAttribute("aria-pressed")).toBe("false");
    await user.click(workTag);
    expect(workTag.getAttribute("aria-pressed")).toBe("true");
  });

  it("侧栏每个主导航入口切换后只暴露当前页", async () => {
    installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    const assertCurrentPage = (currentButton: HTMLElement): void => {
      const currentButtons = Array.from(
        document.querySelectorAll('[aria-current="page"]'),
      );
      expect(currentButtons).toEqual([currentButton]);
    };

    const overviewButton = await screen.findByRole("button", { name: "概览" });
    const nav = screen.getByRole("navigation", { name: "笔记视图" });
    await user.click(overviewButton);
    assertCurrentPage(overviewButton);

    const completedButton = within(nav).getByRole("button", { name: /已完成/ });
    await user.click(completedButton);
    assertCurrentPage(completedButton);

    const archiveButton = within(nav).getByRole("button", { name: /归档/ });
    await user.click(archiveButton);
    assertCurrentPage(archiveButton);

    const trashButton = within(nav).getByRole("button", { name: /回收站/ });
    await user.click(trashButton);
    assertCurrentPage(trashButton);

    const tagSettingsButton = screen.getByRole("button", { name: "标签设置" });
    await user.click(tagSettingsButton);
    assertCurrentPage(tagSettingsButton);
  });

  it("设置页签使用 tablist 和 aria-selected", async () => {
    installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    const tablist = screen.getByRole("tablist");
    expect(
      within(tablist)
        .getByRole("tab", { name: "界面设置" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    await user.click(within(tablist).getByRole("tab", { name: "数据管理" }));
    expect(
      within(tablist)
        .getByRole("tab", { name: "数据管理" })
        .getAttribute("aria-selected"),
    ).toBe("true");
  });
});
