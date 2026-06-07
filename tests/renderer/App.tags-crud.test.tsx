/** @vitest-environment jsdom */
// React 渲染层标签增改测试。
// 作用：
// 1. 覆盖标签设置页内联新增和重命名标签。
// 2. 验证标签设置在主内容区展示并拒绝重命名为已有标签。
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { BASE_TIME, installApi } from "./testUtils";

describe("App tags CRUD", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("标签设置页支持内联新增和重命名标签", async () => {
    const { api, saved } = installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "标签设置" }));
    expect(screen.getByRole("heading", { name: "标签设置" })).toBeTruthy();
    expect(
      screen.getByText("管理全局标签库，变更会同步到左侧筛选和编辑页标签选择。"),
    ).toBeTruthy();

    await user.type(screen.getByPlaceholderText("输入新标签名称"), "阅读{Enter}");
    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    expect(saved.at(-1)?.tags.map((tag) => tag.name)).toContain("阅读");

    const workTagInput = screen.getByDisplayValue("工作");
    await user.clear(workTagInput);
    await user.type(workTagInput, "项目");
    await user.tab();

    await waitFor(() =>
      expect(saved.at(-1)?.tags.map((tag) => tag.name)).toContain("项目"),
    );
    expect(saved.at(-1)?.tags.map((tag) => tag.name)).not.toContain("工作");
    expect(saved.at(-1)?.notes[0]?.tags).toContain("项目");
  });

  it("标签设置按原型在主内容区展示并拒绝重命名为已有标签", async () => {
    const { api } = installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "标签设置" }));
    const tagSettings = screen.getByRole("region", { name: "标签设置" });
    expect(tagSettings).toBeTruthy();
    expect(tagSettings.classList.contains("scrollable-panel")).toBe(true);
    expect(screen.queryByRole("region", { name: "进行中" })).toBeNull();
    expect(screen.queryByRole("region", { name: "设置" })).toBeNull();
    expect(screen.getByPlaceholderText("输入新标签名称")).toBe(document.activeElement);

    const workTagInput = screen.getByDisplayValue("工作");
    await user.clear(workTagInput);
    await user.type(workTagInput, "灵感");
    await user.tab();

    expect(api.saveData).not.toHaveBeenCalled();
  });
});
