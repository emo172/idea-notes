/** @vitest-environment jsdom */
// React 渲染层编辑器新建流程测试。
// 作用：
// 1. 覆盖新建笔记保存、正文行号和全表面编辑器按钮布局。
// 2. 锁定编辑器正文行号与正文文字的样式契约。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { BASE_TIME, RENDERER_SRC, installApi } from "./testUtils";

describe("App editor create", () => {
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

  it("Ctrl+N 打开新建编辑器，Ctrl+S 保存编辑器草稿", async () => {
    const { api, saved } = installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");
    await user.keyboard("{Control>}n{/Control}");

    await screen.findByRole("dialog", { name: "新建笔记" });
    await user.type(screen.getByLabelText("标题"), "快捷键新建");
    await user.type(screen.getByLabelText("正文"), "键盘保存");
    await user.keyboard("{Control>}s{/Control}");

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    expect(saved.at(-1)?.notes[0]?.title).toBe("快捷键新建");
    expect(screen.queryByRole("dialog", { name: "新建笔记" })).toBeNull();
  });

  it("只保留普通新建入口并打开空白草稿", async () => {
    installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");
    expect(screen.queryByRole("button", { name: "快速捕获" })).toBeNull();
    expect(screen.queryByRole("button", { name: "模板" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "新建" }));
    const dialog = screen.getByRole("dialog", { name: "新建笔记" });
    expect(dialog).toBeTruthy();
    expect((within(dialog).getByLabelText("标题") as HTMLInputElement).value).toBe("");
    expect((within(dialog).getByLabelText("正文") as HTMLTextAreaElement).value).toBe(
      "",
    );
    expect(
      (
        within(dialog).getByRole("combobox", {
          name: "优先级",
        }) as HTMLSelectElement
      ).value,
    ).toBe("medium");
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

  it("正文滚动时同步行号滚动位置", async () => {
    installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(await screen.findByRole("button", { name: "新建" }));
    const textarea = screen.getByLabelText("正文") as HTMLTextAreaElement;
    const lineNumbers = container.querySelector(".line-numbers") as HTMLDivElement;

    Object.defineProperty(textarea, "scrollTop", { value: 96, configurable: true });
    textarea.dispatchEvent(new Event("scroll", { bubbles: true }));

    expect(lineNumbers.scrollTop).toBe(96);
  });

  it("正文输入框编号和正文文字使用统一字号与行高", () => {
    // 样式变量直接决定行号和正文对齐，读源码比 jsdom 计算样式更稳定。
    const editorStyles = readFileSync(
      resolve(RENDERER_SRC, "styles/editor-main.css"),
      "utf8",
    );

    expect(editorStyles).toContain("--editor-body-font-size: 14px;");
    expect(editorStyles).toContain("--editor-body-line-height: 1.55;");
    expect(editorStyles).toContain("font-size: var(--editor-body-font-size);");
    expect(editorStyles).toContain("line-height: var(--editor-body-line-height);");
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
