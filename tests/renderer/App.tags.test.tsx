/** @vitest-environment jsdom */
// React 渲染层测试。
// 作用：
// 1. 使用 jsdom 模拟浏览器环境，避免启动真实 Electron 窗口。
// 2. 用假的 window.ideaNotes 验证 App 会从 preload API 加载数据。
// 3. 按功能域拆分测试，避免单个文件过大。
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import type { IdeaNotesData } from "@shared/types";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { BASE_TIME, installApi } from "./testUtils";

describe("App tags", () => {
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

  it("标签空值和重复值显示输入错误且不调用保存", async () => {
    const { api } = installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "标签设置" }));
    const newTagInput = screen.getByPlaceholderText("输入新标签名称");
    await user.click(screen.getByRole("button", { name: "新增" }));

    expect(api.saveData).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe("请输入标签名称");

    await user.type(newTagInput, "工作");
    await user.click(screen.getByRole("button", { name: "新增" }));

    expect(api.saveData).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe("标签已存在");

    await user.clear(newTagInput);
    const workTagInput = screen.getByLabelText("标签 工作");
    await user.clear(workTagInput);
    await user.tab();

    expect(api.saveData).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe("请输入标签名称");

    await user.type(workTagInput, "灵感");
    await user.tab();

    expect(api.saveData).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe("标签已存在");
  });

  it("标签页旧输入错误不遮挡后续保存失败提示", async () => {
    const { api } = installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "标签设置" }));
    await user.type(screen.getByPlaceholderText("输入新标签名称"), "工作");
    await user.click(screen.getByRole("button", { name: "新增" }));
    expect(screen.getByRole("alert").textContent).toBe("标签已存在");

    api.saveData = vi.fn(async () => {
      throw new Error("write failed");
    });
    const workTagInput = screen.getByLabelText("标签 工作");
    await user.clear(workTagInput);
    await user.type(workTagInput, "项目");
    await user.tab();

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    expect(screen.getByRole("alert").textContent).toBe(
      "保存失败，本地数据没有写入。请重试。",
    );
  });

  it("标签删除保存失败时清理旧输入错误并只显示保存失败", async () => {
    const { api } = installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "标签设置" }));
    await user.type(screen.getByPlaceholderText("输入新标签名称"), "工作");
    await user.click(screen.getByRole("button", { name: "新增" }));
    expect(screen.getByRole("alert").textContent).toBe("标签已存在");

    api.saveData = vi.fn(async () => {
      throw new Error("write failed");
    });
    await user.click(screen.getByRole("button", { name: "删除 工作" }));

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    const alerts = screen.getAllByRole("alert");
    expect(alerts).toHaveLength(1);
    expect(alerts[0].textContent).toBe("保存失败，本地数据没有写入。请重试。");
  });

  it("标签保存进行中禁用新增和重命名输入", async () => {
    const { api } = installApi(getDefaultData(BASE_TIME));
    let resolveSave: ((data: IdeaNotesData) => void) | undefined;
    api.saveData = vi.fn(
      (_nextData) =>
        new Promise<IdeaNotesData>((resolve) => {
          resolveSave = resolve;
        }),
    );
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "标签设置" }));
    const newTagInput = screen.getByPlaceholderText("输入新标签名称");
    await user.type(newTagInput, "阅读{Enter}");
    await waitFor(() => expect(api.saveData).toHaveBeenCalledTimes(1));

    expect((newTagInput as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText("标签 工作") as HTMLInputElement).disabled).toBe(
      true,
    );

    await user.type(newTagInput, "后续输入{Enter}");
    expect(api.saveData).toHaveBeenCalledTimes(1);

    const finishSave = resolveSave;
    if (!finishSave) throw new Error("save promise was not created");
    await act(async () => {
      finishSave(getDefaultData(BASE_TIME));
    });
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

  it("标签颜色保存后在侧栏、卡片和编辑器中保持一致", async () => {
    const { api, saved } = installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "标签设置" }));
    const workColorInput = screen.getByLabelText("标签颜色 工作");
    await user.clear(workColorInput);
    await user.type(workColorInput, "#10b981");
    await user.tab();

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    expect(saved.at(-1)?.tags.find((tag) => tag.name === "工作")?.color).toBe(
      "#10b981",
    );

    const workSidebarTag = screen.getByRole("button", { name: "#工作" });
    expect(workSidebarTag.getAttribute("style")).toContain("--tag-color: #10b981");

    await user.click(screen.getByRole("button", { name: /进行中/ }));
    const card = (await screen.findByText("重构 Desktop App 导航栏")).closest(
      "article",
    ) as HTMLElement;
    const cardTag = within(card).getByText("#工作");
    expect(cardTag.getAttribute("style")).toContain("--tag-color: #10b981");

    await user.click(screen.getAllByRole("button", { name: "编辑笔记" })[0]);
    const editor = screen.getByRole("dialog", { name: "编辑笔记" });
    const editorTag = within(editor).getByRole("button", { name: "#工作" });
    expect(editorTag.getAttribute("style")).toContain("--tag-color: #10b981");
  });
});
