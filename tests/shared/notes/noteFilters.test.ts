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

  describe("笔记置顶排序", () => {
    it("置顶笔记排在非置顶笔记之前（important 模式）", () => {
      const notes = [
        note({
          id: "n1",
          updatedAt: baseTime + 30,
          pinned: true,
          priority: "low",
        }),
        note({
          id: "n2",
          updatedAt: baseTime + 50,
          pinned: false,
          priority: "high",
        }),
        note({
          id: "n3",
          updatedAt: baseTime + 40,
          pinned: true,
          priority: "medium",
        }),
        note({
          id: "n4",
          updatedAt: baseTime + 20,
          pinned: false,
          priority: "high",
        }),
      ];

      const result = filterAndSortNotes(notes, {
        status: "active",
        selectedTags: [],
        priority: "all",
        searchQuery: "",
        sortMode: "important",
      });

      // 置顶组在前：n1 和 n3 是置顶，排序按 important（priority 优先，同 priority 按 updatedAt 降序）
      // n3 priority=medium > n1 priority=low → n3 在 n1 之前
      // 非置顶组：n2 priority=high, n4 priority=high → 同 priority 按 updatedAt 降序 → n2(50) > n4(20)
      expect(result.map((item) => item.id)).toEqual(["n3", "n1", "n2", "n4"]);
    });

    it("置顶笔记排在非置顶笔记之前（newest 模式）", () => {
      const notes = [
        note({
          id: "old-pinned",
          updatedAt: baseTime + 10,
          pinned: true,
        }),
        note({
          id: "new-unpinned",
          updatedAt: baseTime + 100,
          pinned: false,
        }),
        note({
          id: "new-pinned",
          updatedAt: baseTime + 80,
          pinned: true,
        }),
        note({
          id: "old-unpinned",
          updatedAt: baseTime + 5,
          pinned: false,
        }),
      ];

      const result = filterAndSortNotes(notes, {
        status: "active",
        selectedTags: [],
        priority: "all",
        searchQuery: "",
        sortMode: "newest",
      });

      // newest 模式按 updatedAt 降序，但置顶组在前
      // 置顶组：new-pinned(80) > old-pinned(10)
      // 非置顶组：new-unpinned(100) > old-unpinned(5)
      expect(result.map((item) => item.id)).toEqual([
        "new-pinned",
        "old-pinned",
        "new-unpinned",
        "old-unpinned",
      ]);
    });

    it("置顶笔记排在非置顶笔记之前（progress 模式）", () => {
      const notes = [
        note({
          id: "pinned-progress",
          pinned: true,
          updatedAt: baseTime + 10,
          checklist: [
            { id: "a", text: "已完成", checked: true },
            { id: "b", text: "未完成", checked: false },
            { id: "c", text: "未完成", checked: false },
          ],
        }),
        note({
          id: "unpinned-full",
          pinned: false,
          updatedAt: baseTime + 50,
          checklist: [{ id: "x", text: "全完成", checked: true }],
        }),
        note({
          id: "pinned-empty",
          pinned: true,
          updatedAt: baseTime + 5,
          checklist: [],
        }),
        note({
          id: "unpinned-half",
          pinned: false,
          updatedAt: baseTime + 30,
          checklist: [
            { id: "d", text: "一半完成", checked: true },
            { id: "e", text: "未完成", checked: false },
          ],
        }),
      ];

      const result = filterAndSortNotes(notes, {
        status: "active",
        selectedTags: [],
        priority: "all",
        searchQuery: "",
        sortMode: "progress",
      });

      // progress 模式按完成率降序（完成率高的在前），但置顶组在前
      // 置顶组：pinned-progress (33% = ratio 0.33) → pinned-empty (0% = ratio 0)
      // 非置顶组：unpinned-full (100% = ratio 1) → unpinned-half (50% = ratio 0.5)
      expect(result.map((item) => item.id)).toEqual([
        "pinned-progress",
        "pinned-empty",
        "unpinned-full",
        "unpinned-half",
      ]);
    });

    it("pinned 为 undefined 或 false 均视为非置顶", () => {
      const notes = [
        note({
          id: "explicit-false",
          pinned: false,
          updatedAt: baseTime + 50,
        }),
        note({
          id: "pinned-true",
          pinned: true,
          updatedAt: baseTime + 10,
        }),
        note({
          id: "implicit-undefined",
          updatedAt: baseTime + 30,
        }),
      ];

      const result = filterAndSortNotes(notes, {
        status: "active",
        selectedTags: [],
        priority: "all",
        searchQuery: "",
        sortMode: "newest",
      });

      // pinned-true 应在最前，explicit-false 和 implicit-undefined 按 newest 排序
      expect(result.map((item) => item.id)).toEqual([
        "pinned-true",
        "explicit-false",
        "implicit-undefined",
      ]);
    });

    it("所有笔记均非置顶时保持原有排序行为不变", () => {
      const notes = [
        note({ id: "a", updatedAt: baseTime + 40, pinned: false }),
        note({ id: "b", updatedAt: baseTime + 10, pinned: false }),
        note({ id: "c", updatedAt: baseTime + 30, pinned: false }),
      ];

      const result = filterAndSortNotes(notes, {
        status: "active",
        selectedTags: [],
        priority: "all",
        searchQuery: "",
        sortMode: "newest",
      });

      expect(result.map((item) => item.id)).toEqual(["a", "c", "b"]);
    });

    it("所有笔记均为置顶时保持原有排序行为不变", () => {
      const notes = [
        note({ id: "x", updatedAt: baseTime + 10, pinned: true }),
        note({ id: "y", updatedAt: baseTime + 30, pinned: true }),
        note({ id: "z", updatedAt: baseTime + 20, pinned: true }),
      ];

      const result = filterAndSortNotes(notes, {
        status: "active",
        selectedTags: [],
        priority: "all",
        searchQuery: "",
        sortMode: "newest",
      });

      expect(result.map((item) => item.id)).toEqual(["y", "z", "x"]);
    });
  });
});
