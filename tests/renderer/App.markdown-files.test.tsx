/** @vitest-environment jsdom */
// React 渲染层 Markdown 文件导入导出测试。
// 作用：
// 1. 覆盖工具栏 Markdown 导入、当前列表批量导出和拖放导入。
// 2. 覆盖卡片菜单单条 Markdown 导出反馈。
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { BASE_TIME, installApi } from "./testUtils";

describe("App Markdown files", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("从卡片更多菜单导出单条 Markdown", async () => {
    const data = getDefaultData(BASE_TIME);
    const { api } = installApi(data);
    const user = userEvent.setup();

    render(<App />);

    const card = (await screen.findByText("重构 Desktop App 导航栏")).closest(
      "article",
    ) as HTMLElement;
    await user.click(within(card).getByRole("button", { name: "更多操作" }));
    await user.click(
      within(screen.getByRole("menu", { name: "更多操作" })).getByRole("menuitem", {
        name: "导出文档",
      }),
    );

    await waitFor(() =>
      expect(api.exportNoteMarkdown).toHaveBeenCalledWith("seed-navigation"),
    );
    expect(screen.getByRole("alert").textContent).toBe("Markdown 导出完成。");
  });

  it("从工具栏批量导出当前可见列表", async () => {
    const data = getDefaultData(BASE_TIME);
    const { api } = installApi(data);
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");
    await user.click(screen.getByRole("button", { name: "导出文档" }));

    await waitFor(() =>
      expect(api.exportNotesMarkdown).toHaveBeenCalledWith([
        "seed-navigation",
        "seed-naming",
      ]),
    );
  });

  it("从工具栏选择多个 Markdown 文件导入并刷新列表", async () => {
    const data = getDefaultData(BASE_TIME);
    const importedData = {
      ...data,
      notes: [
        { ...data.notes[0], id: "imported-md", title: "导入 Markdown" },
        ...data.notes,
      ],
    };
    const { api } = installApi(data);
    api.importMarkdownFiles = vi.fn(async () => ({
      ok: true,
      importedCount: 1,
      data: importedData,
    }));
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");
    await user.click(screen.getByRole("button", { name: "导入文档" }));

    await waitFor(() =>
      expect(api.importMarkdownFiles).toHaveBeenCalledWith("未命名笔记"),
    );
    const list = screen.getByRole("region", { name: "进行中" });
    expect(within(list).getByRole("button", { name: "导入 Markdown" })).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe("Markdown 导入完成。");
  });

  it("拖放多个 Markdown 文件路径导入并显示部分跳过反馈", async () => {
    const data = getDefaultData(BASE_TIME);
    const importedData = {
      ...data,
      notes: [
        { ...data.notes[0], id: "dropped-md", title: "拖放 Markdown" },
        ...data.notes,
      ],
    };
    const { api } = installApi(data);
    api.importDroppedMarkdownFiles = vi.fn(async () => ({
      ok: true,
      importedCount: 1,
      skippedFiles: ["/tmp/plain.txt"],
      data: importedData,
    }));
    const markdownFile = new File(["# 拖放 Markdown"], "a.md", {
      type: "text/markdown",
    });
    const plainFile = new File(["plain text"], "plain.txt", { type: "text/plain" });
    api.getDroppedFilePath = vi.fn((file) =>
      file === markdownFile ? "/tmp/a.md" : "/tmp/plain.txt",
    );

    render(<App />);

    const list = await screen.findByRole("region", { name: "进行中" });
    fireEvent.dragOver(list, {
      dataTransfer: { files: [markdownFile, plainFile] },
    });
    expect(screen.getByText("松开以导入 Markdown 文件")).toBeTruthy();
    fireEvent.drop(list, {
      dataTransfer: { files: [markdownFile, plainFile] },
    });

    expect(api.getDroppedFilePath).toHaveBeenCalledWith(markdownFile);
    expect(api.getDroppedFilePath).toHaveBeenCalledWith(plainFile);
    await waitFor(() =>
      expect(api.importDroppedMarkdownFiles).toHaveBeenCalledWith(
        ["/tmp/a.md", "/tmp/plain.txt"],
        "未命名笔记",
      ),
    );
    expect(await screen.findByText("拖放 Markdown")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe(
      "Markdown 导入完成，部分文件已跳过。",
    );
  });
});
