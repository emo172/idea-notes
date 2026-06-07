// 笔记筛选和搜索纯逻辑测试。
// 作用：
// 1. 验证状态、标签、优先级和搜索词组合过滤。
// 2. 验证结构化搜索语法解析后能收窄筛选结果。
// 3. 验证普通搜索匹配标题、正文和标签名。
import { afterEach, describe, expect, it, vi } from "vitest";
import { filterAndSortNotes } from "../../../src/shared/notes/noteFilters";
import { parseSearchQuery } from "../../../src/shared/notes/searchQuery";
import type { IdeaNote } from "../../../src/shared/types";

const baseTime = Date.parse("2026-05-29T08:00:00.000Z");

function note(overrides: Partial<IdeaNote>): IdeaNote {
  // 测试辅助函数提供稳定的默认笔记，单个用例只覆盖自己关心的字段。
  return {
    id: "note-base",
    title: "基础笔记",
    body: "基础内容",
    priority: "medium",
    tags: [],
    status: "active",
    checklist: [],
    createdAt: baseTime,
    updatedAt: baseTime,
    ...overrides,
  };
}

describe("noteFilters", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("按标签交集、优先级和搜索词过滤并排序", () => {
    // 同时覆盖状态、标签交集、优先级和搜索词，避免筛选条件互相覆盖。
    const notes = [
      note({
        id: "n1",
        title: "桌面窗口实现",
        body: "Electron 主进程和窗口控制",
        priority: "high",
        tags: ["工作", "待办"],
        updatedAt: baseTime + 30,
        checklist: [
          { id: "n1-a", text: "主进程", checked: true },
          { id: "n1-b", text: "窗口控制", checked: false },
        ],
      }),
      note({
        id: "n2",
        title: "桌面视觉草稿",
        body: "界面配色",
        priority: "medium",
        tags: ["工作", "灵感"],
        updatedAt: baseTime + 50,
      }),
      note({
        id: "n3",
        title: "旧笔记",
        body: "桌面归档",
        priority: "high",
        tags: ["工作", "待办"],
        status: "completed",
        updatedAt: baseTime + 100,
      }),
    ];

    const result = filterAndSortNotes(notes, {
      status: "active",
      selectedTags: ["工作", "待办"],
      priority: "high",
      searchQuery: "窗口",
      sortMode: "important",
    });

    expect(result.map((item) => item.id)).toEqual(["n1"]);
  });

  it("解析搜索语法并用标签、优先级和截止状态收窄结果", () => {
    vi.spyOn(Date, "now").mockReturnValue(baseTime);
    const notes = [
      note({
        id: "n1",
        title: "桌面窗口实现",
        body: "Electron 主进程",
        priority: "high",
        tags: ["工作", "待办"],
        dueAt: "2026-05-28T18:00",
        updatedAt: baseTime + 30,
      }),
      note({
        id: "n2",
        title: "阅读计划",
        body: "整理书单",
        priority: "medium",
        tags: ["阅读"],
        dueAt: "2026-05-30T18:00",
        updatedAt: baseTime + 50,
      }),
      note({
        id: "n3",
        title: "工作复盘",
        body: "窗口体验回顾",
        priority: "low",
        tags: ["工作"],
        updatedAt: baseTime + 80,
      }),
    ];

    const parsed = parseSearchQuery(" 窗口 tag:工作 priority:high due:overdue ");
    const result = filterAndSortNotes(notes, {
      status: "active",
      selectedTags: [],
      priority: "all",
      searchQuery: "窗口 tag:工作 priority:high due:overdue",
      sortMode: "newest",
    });

    expect(parsed).toEqual({
      text: "窗口",
      tags: ["工作"],
      priorities: ["high"],
      due: "overdue",
    });
    expect(result.map((item) => item.id)).toEqual(["n1"]);
  });

  it("普通搜索同时匹配标题、正文和笔记标签名", () => {
    const notes = [
      note({
        id: "title-match",
        title: "桌面窗口实现",
        body: "Electron",
        tags: ["工作"],
      }),
      note({
        id: "body-match",
        title: "阅读计划",
        body: "整理书单",
        tags: ["计划"],
      }),
      note({
        id: "tag-match",
        title: "配色草稿",
        body: "界面视觉",
        tags: ["灵感"],
      }),
    ];

    const titleResult = filterAndSortNotes(notes, {
      status: "active",
      selectedTags: [],
      priority: "all",
      searchQuery: "窗口",
      sortMode: "newest",
    });
    const bodyResult = filterAndSortNotes(notes, {
      status: "active",
      selectedTags: [],
      priority: "all",
      searchQuery: "书单",
      sortMode: "newest",
    });
    const tagResult = filterAndSortNotes(notes, {
      status: "active",
      selectedTags: [],
      priority: "all",
      searchQuery: "灵感",
      sortMode: "newest",
    });

    expect(titleResult.map((item) => item.id)).toEqual(["title-match"]);
    expect(bodyResult.map((item) => item.id)).toEqual(["body-match"]);
    expect(tagResult.map((item) => item.id)).toEqual(["tag-match"]);
  });
});
