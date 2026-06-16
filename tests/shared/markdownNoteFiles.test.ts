// Markdown 笔记文件纯逻辑测试。
// 作用：
// 1. 锁定常见 Markdown 文件导入为笔记草稿的规则。
// 2. 锁定笔记导出 Markdown 文本和安全文件名规则。
import { describe, expect, it } from "vitest";
import {
  buildMarkdownExportFileName,
  parseMarkdownNoteDraft,
  serializeNoteToMarkdown,
} from "../../src/shared/markdownNoteFiles";
import type { IdeaNote } from "../../src/shared/types";

describe("Markdown 笔记文件纯逻辑", () => {
  it("导入时用首个一级标题作为标题并保留正文", () => {
    const parsed = parseMarkdownNoteDraft({
      fileName: "fallback.md",
      markdown: "# 项目计划\n\n正文第一段\n## 小节\n继续记录",
      fallbackTitle: "未命名笔记",
    });

    expect(parsed.title).toBe("项目计划");
    expect(parsed.body).toBe("正文第一段\n## 小节\n继续记录");
    expect(parsed.checkedStates).toEqual([false, false, false]);
    expect(parsed.priority).toBe("medium");
    expect(parsed.tags).toEqual([]);
  });

  it("导入时没有一级标题就用文件名作为标题", () => {
    const parsed = parseMarkdownNoteDraft({
      fileName: "meeting-notes.markdown",
      markdown: "## 会议\n- 记录决议",
      fallbackTitle: "未命名笔记",
    });

    expect(parsed.title).toBe("meeting-notes");
    expect(parsed.body).toBe("## 会议\n- 记录决议");
  });

  it("导入时识别 Markdown 任务列表并保留未勾选普通行", () => {
    const parsed = parseMarkdownNoteDraft({
      fileName: "todo.md",
      markdown: "# Todo\n- [x] 已完成\n- [ ] 未完成\n* [X] 大写完成\n+ 普通条目",
      fallbackTitle: "未命名笔记",
    });

    expect(parsed.body).toBe("- [x] 已完成\n- [ ] 未完成\n* [X] 大写完成\n+ 普通条目");
    expect(parsed.checkedStates).toEqual([true, false, true, false]);
  });

  it("导出笔记为 Markdown 时保留元数据和正文", () => {
    const note: IdeaNote = {
      id: "note-1",
      title: "导出标题",
      body: "正文\n- [x] 已完成",
      priority: "high",
      tags: ["工作", "导出"],
      status: "active",
      checklist: [
        { id: "note-1-item-1", text: "正文", checked: false },
        { id: "note-1-item-2", text: "- [x] 已完成", checked: true },
      ],
      createdAt: Date.parse("2026-06-16T08:00:00.000Z"),
      updatedAt: Date.parse("2026-06-16T09:00:00.000Z"),
      pinned: false,
    };

    expect(serializeNoteToMarkdown(note)).toBe(
      [
        "# 导出标题",
        '<!-- idea-notes: {"priority":"high","tags":["工作","导出"],"checkedStates":[false,true]} -->',
        "",
        "正文",
        "- [x] 已完成",
        "",
      ].join("\n"),
    );
  });

  it("清洗导出文件名并为空标题提供兜底", () => {
    expect(buildMarkdownExportFileName("计划/草稿:第一版", "未命名笔记")).toBe(
      "计划-草稿-第一版.md",
    );
    expect(buildMarkdownExportFileName("   ", "未命名笔记")).toBe("未命名笔记.md");
  });
});
