// 标签纯逻辑测试。
// 作用：
// 1. 验证标签创建、唯一 ID 和颜色更新规则。
// 2. 验证标签重命名和删除会同步到笔记引用。
// 3. 验证非法标签名和非法颜色不会改写数据。
import { describe, expect, it } from "vitest";
import { defaultSettings } from "../../../src/shared/defaultData";
import {
  createNextTag,
  createTag,
  deleteTag,
  ensureUniqueTagId,
  renameTag,
  updateTagColor,
} from "../../../src/shared/tags/tagLogic";
import type { IdeaNote, IdeaNotesData, IdeaTag } from "../../../src/shared/types";

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

function tag(overrides: Partial<IdeaTag>): IdeaTag {
  return {
    id: "tag-base",
    name: "基础标签",
    color: "#2563eb",
    ...overrides,
  };
}

describe("tagLogic", () => {
  it("重命名与删除标签同步到笔记", () => {
    // 标签管理必须同步全局标签和笔记引用，否则筛选入口会与数据不一致。
    const data: IdeaNotesData = {
      tags: [
        tag({ id: "tag-work", name: "工作", color: "#2563eb" }),
        tag({ id: "tag-idea", name: "灵感", color: "#7c3aed" }),
        tag({ id: "tag-todo", name: "待办", color: "#f97316" }),
      ],
      settings: { ...defaultSettings },
      notes: [
        note({ id: "n1", tags: ["工作", "灵感"] }),
        note({ id: "n2", tags: ["待办"] }),
      ],
    };

    const renamed = renameTag(data, "工作", "项目");
    expect(renamed.tags.map((item) => item.name)).toEqual(["项目", "灵感", "待办"]);
    expect(renamed.tags[0]).toMatchObject({
      id: "tag-work",
      color: "#2563eb",
    });
    expect(renamed.notes.find((item) => item.id === "n1")?.tags).toEqual([
      "项目",
      "灵感",
    ]);

    const removed = deleteTag(renamed, "灵感");
    expect(removed.tags.map((item) => item.name)).toEqual(["项目", "待办"]);
    expect(removed.notes.find((item) => item.id === "n1")?.tags).toEqual(["项目"]);
  });

  it("标签重命名在 shared 层裁剪空白并拒绝空值和重复名", () => {
    const data: IdeaNotesData = {
      tags: [
        tag({ id: "tag-work", name: "工作" }),
        tag({ id: "tag-idea", name: "灵感" }),
        tag({ id: "tag-todo", name: "待办" }),
      ],
      settings: { ...defaultSettings },
      notes: [
        note({ id: "n1", tags: ["工作", "灵感"] }),
        note({ id: "n2", tags: ["待办"] }),
      ],
    };

    const renamed = renameTag(data, "工作", " 项目 ");
    expect(renamed.tags.map((item) => item.name)).toEqual(["项目", "灵感", "待办"]);
    expect(renamed.notes.find((item) => item.id === "n1")?.tags).toEqual([
      "项目",
      "灵感",
    ]);

    expect(renameTag(data, "工作", " ")).toBe(data);
    expect(renameTag(data, "工作", "灵感")).toBe(data);
    expect(renameTag(data, "工作", " 工作 ")).toBe(data);
  });

  it("标签创建和颜色更新只影响全局标签对象", () => {
    const data: IdeaNotesData = {
      tags: [tag({ id: "tag-work", name: "工作", color: "#2563eb" })],
      settings: { ...defaultSettings },
      notes: [note({ id: "n1", tags: ["工作"] })],
    };

    const created = createTag("阅读", 1);
    const recolored = updateTagColor(data, "工作", " #10B981 ");
    const missing = updateTagColor(data, "不存在", "#111111");
    const invalidColor = updateTagColor(data, "工作", "not-a-color");

    expect(created).toMatchObject({
      id: "tag-2",
      name: "阅读",
      color: "#7c3aed",
    });
    expect(recolored.tags[0]).toEqual({
      id: "tag-work",
      name: "工作",
      color: "#10b981",
    });
    expect(recolored.notes[0]?.tags).toEqual(["工作"]);
    expect(missing).toBe(data);
    expect(invalidColor).toBe(data);
  });

  it("基于现有标签最大序号创建唯一标签 ID", () => {
    const existingTags = [
      tag({ id: "tag-1", name: "工作" }),
      tag({ id: "tag-3", name: "待办" }),
    ];

    const created = createNextTag("阅读", existingTags);
    const deduplicated = ensureUniqueTagId(
      tag({ id: "tag-3", name: "导入", color: "#10b981" }),
      existingTags,
    );

    expect(created).toEqual({
      id: "tag-4",
      name: "阅读",
      color: "#f97316",
    });
    expect(deduplicated).toEqual({
      id: "tag-4",
      name: "导入",
      color: "#10b981",
    });
  });
});
