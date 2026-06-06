/** @vitest-environment jsdom */
// React 渲染层编辑器失败流程测试。
// 作用：
// 1. 覆盖新建和编辑保存失败时草稿保留。
// 2. 验证保存进行中会禁用编辑器输入和取消动作。
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import type { IdeaNotesData } from "@shared/types";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { BASE_TIME, installApi } from "./testUtils";

describe("App editor failure", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("保存失败时保留编辑器草稿并显示错误提示", async () => {
    const { api } = installApi(getDefaultData(BASE_TIME));
    api.saveData = vi.fn(async () => {
      throw new Error("write failed");
    });
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "新建" }));
    await user.type(screen.getByLabelText("标题"), "保存失败标题");
    await user.type(screen.getByLabelText("正文"), "保存失败正文");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    expect(screen.getByRole("heading", { name: "新建笔记" })).toBeTruthy();
    expect(screen.getByDisplayValue("保存失败标题")).toBeTruthy();
    expect(screen.getByDisplayValue("保存失败正文")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe(
      "保存失败，本地数据没有写入。请重试。",
    );
  });

  it("编辑已有笔记保存失败时保留编辑器草稿并显示错误提示", async () => {
    const data = getDefaultData(BASE_TIME);
    const sourceNote = data.notes[0];
    const { api } = installApi(data);
    api.saveData = vi.fn(async () => {
      throw new Error("write failed");
    });
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: sourceNote.title }));
    await user.clear(screen.getByLabelText("标题"));
    await user.type(screen.getByLabelText("标题"), "保存失败后的编辑标题");
    await user.clear(screen.getByLabelText("正文"));
    await user.type(screen.getByLabelText("正文"), "保存失败后的编辑正文");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    expect(screen.getByRole("heading", { name: "编辑笔记" })).toBeTruthy();
    expect(screen.getByDisplayValue("保存失败后的编辑标题")).toBeTruthy();
    expect(screen.getByDisplayValue("保存失败后的编辑正文")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe(
      "保存失败，本地数据没有写入。请重试。",
    );
  });

  it("保存进行中禁用编辑器取消按钮直到保存结束", async () => {
    const { api } = installApi(getDefaultData(BASE_TIME));
    let rejectSave: ((error: Error) => void) | undefined;
    api.saveData = vi.fn(
      (_nextData) =>
        new Promise<IdeaNotesData>((_resolve, reject) => {
          rejectSave = reject;
        }),
    );
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "新建" }));
    await user.type(screen.getByLabelText("标题"), "保存中标题");
    await user.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(api.saveData).toHaveBeenCalled());

    const dialog = screen.getByRole("dialog", { name: "新建笔记" });
    const cancelButton = screen.getByRole("button", { name: "取消" });
    expect((cancelButton as HTMLButtonElement).disabled).toBe(true);
    expect((within(dialog).getByLabelText("标题") as HTMLInputElement).disabled).toBe(
      true,
    );
    expect(
      (within(dialog).getByLabelText("正文") as HTMLTextAreaElement).disabled,
    ).toBe(true);
    expect(
      (
        within(dialog).getByRole("combobox", {
          name: /优先级/,
        }) as HTMLSelectElement
      ).disabled,
    ).toBe(true);
    await user.click(cancelButton);
    await user.click(screen.getByRole("button", { name: "设置" }));
    expect(screen.getByRole("heading", { name: "新建笔记" })).toBeTruthy();

    const failSave = rejectSave;
    if (!failSave) throw new Error("save promise was not created");
    await act(async () => {
      failSave(new Error("write failed"));
    });

    expect(screen.getByRole("alert").textContent).toBe(
      "保存失败，本地数据没有写入。请重试。",
    );
  });
});
