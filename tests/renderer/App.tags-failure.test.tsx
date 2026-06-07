/** @vitest-environment jsdom */
// React 渲染层标签失败路径测试。
// 作用：
// 1. 覆盖空值、重复值输入错误和保存失败反馈。
// 2. 验证标签保存进行中会禁用新增和重命名输入。
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import type { IdeaNotesData } from "@shared/types";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { BASE_TIME, installApi } from "./testUtils";

describe("App tags failure", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
});
