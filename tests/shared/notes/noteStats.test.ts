// 笔记统计纯逻辑测试。
// 作用：
// 1. 验证统计会排除回收站笔记的总数和优先级计数。
// 2. 验证状态计数、完成率、逾期数量和标签 Top N。
import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateNoteStats } from "../../../src/shared/notes/noteStats";
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

describe("noteStats", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("统计笔记状态、优先级、标签 Top N 和逾期数量", () => {
    vi.spyOn(Date, "now").mockReturnValue(baseTime);
    const stats = calculateNoteStats([
      note({
        id: "active-high-overdue",
        status: "active",
        priority: "high",
        tags: ["工作", "待办"],
        dueAt: "2026-05-28T18:00",
      }),
      note({
        id: "completed-medium",
        status: "completed",
        priority: "medium",
        tags: ["工作"],
      }),
      note({
        id: "archive-low",
        status: "archive",
        priority: "low",
        tags: ["归档"],
      }),
      note({
        id: "trash-high",
        status: "trash",
        priority: "high",
        tags: ["工作"],
        dueAt: "2026-05-28T18:00",
      }),
    ]);

    expect(stats.total).toBe(3);
    expect(stats.completionRate).toBeCloseTo(1 / 3);
    expect(stats.overdue).toBe(1);
    expect(stats.highPriority).toBe(1);
    expect(stats.statusCounts).toEqual({
      active: 1,
      completed: 1,
      archive: 1,
      trash: 1,
    });
    expect(stats.priorityCounts).toEqual({
      high: 1,
      medium: 1,
      low: 1,
    });
    expect(stats.topTags).toEqual([
      { tag: "工作", count: 2 },
      { tag: "待办", count: 1 },
      { tag: "归档", count: 1 },
    ]);
  });
});
