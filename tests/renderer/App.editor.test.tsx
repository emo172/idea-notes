/** @vitest-environment jsdom */
// React 渲染层测试。
// 作用：
// 1. 使用 jsdom 模拟浏览器环境，避免启动真实 Electron 窗口。
// 2. 用假的 window.ideaNotes 验证 App 会从 preload API 加载数据。
// 3. 按功能域拆分测试，避免单个文件过大。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import type { IdeaNotesData } from "@shared/types";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { appCopy } from "../../src/renderer/src/i18n";
import { formatDate } from "../../src/renderer/src/utils/dateFormatting";
import { BASE_TIME, RENDERER_SRC, installApi } from "./testUtils";

describe("App editor", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("新建笔记后调用持久化 API", async () => {
    // 新建流程从点击按钮到保存，验证 UI 会把多行正文转成清单并持久化。
    const { api, saved } = installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "新建" }));
    await user.clear(screen.getByLabelText("标题"));
    await user.type(screen.getByLabelText("标题"), "桌面软件验收");
    await user.type(screen.getByLabelText("正文"), "创建窗口\n保存数据");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    expect(saved.at(-1)?.notes[0]?.title).toBe("桌面软件验收");
    expect(saved.at(-1)?.notes[0]?.checklist).toHaveLength(2);
    const newNoteCard = screen
      .getByText("桌面软件验收")
      .closest("article") as HTMLElement;
    expect(
      Array.from(
        newNoteCard.querySelectorAll(".progress-bar-segment"),
        (segment) => segment.className,
      ),
    ).toEqual(["progress-bar-segment pending", "progress-bar-segment pending"]);
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

    await user.click(
      await screen.findByRole("button", { name: sourceNote.title }),
    );
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
    expect(
      (within(dialog).getByLabelText("标题") as HTMLInputElement).disabled,
    ).toBe(true);
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

  it("编辑已有笔记时显示创建时间和修改时间并在保存后刷新修改时间", async () => {
    const saveTime = Date.parse("2026-05-30T09:30:00.000Z");
    const initialData = getDefaultData(BASE_TIME);
    const sourceNote = initialData.notes[0];
    const copy = appCopy["zh-CN"];
    const { api, saved } = installApi(initialData);
    const user = userEvent.setup();

    vi.spyOn(Date, "now").mockReturnValue(saveTime);
    render(<App />);

    await user.click(
      await screen.findByRole("button", { name: sourceNote.title }),
    );

    screen.getByText(copy.createdAt);
    screen.getByText(copy.updatedAt);
    screen.getByText(formatDate(sourceNote.createdAt, "zh-CN", copy));
    screen.getByText(formatDate(sourceNote.updatedAt, "zh-CN", copy));

    await user.clear(screen.getByLabelText(copy.title));
    await user.type(screen.getByLabelText(copy.title), "更新后的导航栏笔记");
    await user.click(screen.getByRole("button", { name: copy.saveNote }));

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    const savedNote = saved
      .at(-1)
      ?.notes.find((note) => note.id === sourceNote.id);
    expect(savedNote?.createdAt).toBe(sourceNote.createdAt);
    expect(savedNote?.updatedAt).toBe(saveTime);
  });

  it("编辑正文重建清单时保留相同位置同文本的勾选状态", async () => {
    const initialData = getDefaultData(BASE_TIME);
    const sourceNote = {
      ...initialData.notes[0],
      body: "保留任务\n改写前任务",
      checklist: [
        {
          id: "seed-navigation-item-1",
          text: "保留任务",
          checked: true,
        },
        {
          id: "seed-navigation-item-2",
          text: "改写前任务",
          checked: true,
        },
      ],
    };
    const { api, saved } = installApi({
      ...initialData,
      notes: [sourceNote, ...initialData.notes.slice(1)],
    });
    const user = userEvent.setup();

    render(<App />);

    await user.click(
      await screen.findByRole("button", { name: sourceNote.title }),
    );
    await user.clear(screen.getByLabelText("正文"));
    await user.type(screen.getByLabelText("正文"), "保留任务\n改写后任务");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    const savedNote = saved
      .at(-1)
      ?.notes.find((item) => item.id === sourceNote.id);
    expect(savedNote?.checklist).toEqual([
      {
        id: "seed-navigation-item-1",
        text: "保留任务",
        checked: true,
      },
      {
        id: "seed-navigation-item-2",
        text: "改写后任务",
        checked: false,
      },
    ]);
  });

  it("新增笔记正文输入框默认显示三行编号并随换行扩展", async () => {
    const { api, saved } = installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();
    const { container } = render(<App />);
    const bodyLines = ["第一行", "第二行", "第三行", "第四行"];
    const bodyText = bodyLines.join("\n");

    await user.click(await screen.findByRole("button", { name: "新建" }));
    // 行号是纯视觉辅助，用 DOM 查询锁定数量即可，避免把它暴露成可访问文本。
    const getLineNumbers = () =>
      Array.from(
        container.querySelectorAll(".line-numbers span"),
        (element) => element.textContent ?? "",
      );

    expect(getLineNumbers()).toEqual(["1", "2", "3"]);
    await user.type(screen.getByLabelText("正文"), bodyText);
    expect(getLineNumbers()).toEqual(["1", "2", "3", "4"]);

    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    expect(saved.at(-1)?.notes[0]?.body).toBe(bodyText);
    expect(saved.at(-1)?.notes[0]?.checklist.map((item) => item.text)).toEqual(
      bodyLines,
    );
  });

  it("正文输入框编号和正文文字使用统一字号与行高", () => {
    // 样式变量直接决定行号和正文对齐，读源码比 jsdom 计算样式更稳定。
    const editorStyles = readFileSync(
      resolve(RENDERER_SRC, "styles/editor.css"),
      "utf8",
    );

    expect(editorStyles).toContain("--editor-body-font-size: 14px;");
    expect(editorStyles).toContain("--editor-body-line-height: 1.55;");
    expect(editorStyles).toContain("font-size: var(--editor-body-font-size);");
    expect(editorStyles).toContain(
      "line-height: var(--editor-body-line-height);",
    );
    expect(editorStyles).toContain(".line-numbers,");
    expect(editorStyles).toContain(".editor-textarea {");
  });

  it("使用全表面编辑器并通过取消按钮关闭", async () => {
    installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    const { container } = render(<App />);

    await user.click(await screen.findByRole("button", { name: "新建" }));
    expect(screen.getByPlaceholderText("输入标题...")).toBeTruthy();
    const cancelButton = screen.getByRole("button", { name: "取消" });
    const saveButton = screen.getByRole("button", { name: "保存" });
    const actionButtons = container.querySelectorAll(".editor-actions button");

    expect(Array.from(actionButtons)).toEqual([cancelButton, saveButton]);
    expect(cancelButton.classList.contains("editor-cancel-action")).toBe(true);
    expect(cancelButton.querySelector(".editor-cancel-icon")).toBeTruthy();
    expect(cancelButton.querySelector(".editor-back-icon")).toBeNull();
    expect(saveButton.classList.contains("editor-save-action")).toBe(true);
    expect(screen.queryByRole("button", { name: "返回" })).toBeNull();

    await user.click(cancelButton);
    expect(screen.queryByPlaceholderText("输入标题...")).toBeNull();
  });
});
