// 笔记创建与置顶切换纯逻辑测试。
// 作用：
// 1. 验证 toggleNotePin 正确翻转 pinned 状态。
// 2. 验证 toggleNotePin 保留其他字段并更新 updatedAt。
import { describe, expect, it } from "vitest";
import { toggleNotePin } from "../../../src/shared/notes/noteMutations";
import type { IdeaNote } from "../../../src/shared/types";

const baseTime = Date.parse("2026-05-29T08:00:00.000Z");

function note(overrides: Partial<IdeaNote>): IdeaNote {
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

describe("noteMutations", () => {
  describe("toggleNotePin", () => {
    it("将 pinned 从 undefined 翻转为 true", () => {
      const n = note({ pinned: undefined });
      const result = toggleNotePin(n, baseTime);
      expect(result.pinned).toBe(true);
    });

    it("将 pinned 从 false 翻转为 true", () => {
      const n = note({ pinned: false });
      const result = toggleNotePin(n, baseTime);
      expect(result.pinned).toBe(true);
    });

    it("将 pinned 从 true 翻转为 false", () => {
      const n = note({ pinned: true });
      const result = toggleNotePin(n, baseTime);
      expect(result.pinned).toBe(false);
    });

    it("更新 updatedAt 为 now 参数值", () => {
      const n = note({ updatedAt: 100, pinned: false });
      const result = toggleNotePin(n, 200);
      expect(result.updatedAt).toBe(200);
    });

    it("保留除 pinned 和 updatedAt 之外的所有字段不变", () => {
      const original = note({
        id: "test-id",
        title: "测试标题",
        body: "测试正文",
        priority: "high",
        tags: ["工作", "待办"],
        status: "active",
        checklist: [{ id: "c1", text: "任务", checked: false }],
        dueAt: "2026-06-01T12:00",
        createdAt: 100,
        updatedAt: 150,
        trashedAt: undefined,
        notifiedReminderKeys: ["key-1"],
      });
      const result = toggleNotePin(original, baseTime);

      expect(result.id).toBe(original.id);
      expect(result.title).toBe(original.title);
      expect(result.body).toBe(original.body);
      expect(result.priority).toBe(original.priority);
      expect(result.tags).toEqual(original.tags);
      expect(result.status).toBe(original.status);
      expect(result.checklist).toEqual(original.checklist);
      expect(result.dueAt).toBe(original.dueAt);
      expect(result.createdAt).toBe(original.createdAt);
      expect(result.notifiedReminderKeys).toEqual(original.notifiedReminderKeys);
      // pinned 应翻转（原始为 undefined，翻转为 true）
      expect(result.pinned).toBe(true);
      // updatedAt 应更新为传入的 now 值
      expect(result.updatedAt).toBe(baseTime);
    });

    it("多次切换回到初始状态", () => {
      const n = note({ pinned: false });
      const first = toggleNotePin(n, baseTime);
      expect(first.pinned).toBe(true);
      const second = toggleNotePin(first, baseTime);
      expect(second.pinned).toBe(false);
    });

    it("返回的是新对象而非原始引用", () => {
      const n = note({ pinned: false });
      const result = toggleNotePin(n, baseTime);
      expect(result).not.toBe(n);
    });
  });
});
