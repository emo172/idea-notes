// 笔记清单纯逻辑测试。
// 作用：
// 1. 验证正文拆分为清单项的规则和完成度统计。
// 2. 验证清单项状态切换只影响目标项。
// 3. 验证笔记创建和复制时清单项 ID 保持稳定且不复用旧身份。
import { describe, expect, it } from "vitest";
import {
  buildChecklistItems,
  getCompletion,
  toggleChecklistItem,
} from "../../../src/shared/notes/checklistLogic";
import { createNote, duplicateNote } from "../../../src/shared/notes/noteMutations";
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

describe("checklistLogic", () => {
  it("从多行正文创建笔记并生成清单项", () => {
    // 验证正文按行生成清单项，这是编辑器保存后的核心数据转换。
    const created = createNote(
      {
        title: "实现桌面软件",
        body: "创建窗口\n保存本地数据\n验证构建",
        priority: "high",
        tags: ["工作", "待办"],
        dueAt: "2026-05-30T18:00",
      },
      { now: baseTime, id: "note-1" },
    );

    expect(created).toMatchObject({
      id: "note-1",
      title: "实现桌面软件",
      status: "active",
      priority: "high",
      tags: ["工作", "待办"],
      dueAt: "2026-05-30T18:00",
      createdAt: baseTime,
      updatedAt: baseTime,
    });
    expect(created.checklist.map((item) => item.text)).toEqual([
      "创建窗口",
      "保存本地数据",
      "验证构建",
    ]);
    expect(getCompletion(created)).toEqual({
      completed: 0,
      total: 3,
      ratio: 0,
    });
  });

  it("默认生成 ID 时同一毫秒创建和复制笔记也不碰撞", () => {
    const draft = {
      title: "同毫秒新建",
      body: "第一项\n第二项",
      priority: "medium" as const,
      tags: [],
    };
    const firstCreated = createNote(draft, { now: baseTime });
    const secondCreated = createNote(draft, { now: baseTime });
    const source = note({ id: "copy-source", title: "复制来源" });
    const firstCopied = duplicateNote(source, { now: baseTime });
    const secondCopied = duplicateNote(source, { now: baseTime });

    expect(firstCreated.id).not.toBe(secondCreated.id);
    expect(firstCopied.id).not.toBe(secondCopied.id);
    expect(firstCreated.checklist.map((item) => item.id)).toEqual([
      `${firstCreated.id}-item-1`,
      `${firstCreated.id}-item-2`,
    ]);
  });

  it("复制带清单的笔记时使用新笔记 ID 重建清单项 ID", () => {
    const source = note({
      id: "copy-source",
      title: "复制来源",
      body: "第一项\n第二项",
      checklist: [
        { id: "copy-source-item-1", text: "第一项", checked: true },
        { id: "copy-source-item-2", text: "第二项", checked: false },
      ],
    });

    const copied = duplicateNote(source, {
      id: "copy-target",
      now: baseTime + 10,
    });

    expect(copied.checklist).toEqual([
      { id: "copy-target-item-1", text: "第一项", checked: true },
      { id: "copy-target-item-2", text: "第二项", checked: false },
    ]);
  });

  it("无效清单项更新不会修改笔记或更新时间", () => {
    const source = note({
      id: "checklist-source",
      updatedAt: baseTime,
      checklist: [{ id: "item-1", text: "已有任务", checked: false }],
    });

    const result = toggleChecklistItem(source, "missing-item", true, baseTime + 10);

    expect(result).toBe(source);
    expect(result.updatedAt).toBe(baseTime);
    expect(result.checklist[0]?.checked).toBe(false);
  });

  it("有效清单项更新只切换目标项并更新时间", () => {
    const source = note({
      id: "checklist-source",
      updatedAt: baseTime,
      checklist: [
        { id: "item-1", text: "目标任务", checked: false },
        { id: "item-2", text: "其他任务", checked: false },
      ],
    });

    const result = toggleChecklistItem(source, "item-1", true, baseTime + 10);

    expect(result.updatedAt).toBe(baseTime + 10);
    expect(result.checklist).toEqual([
      { id: "item-1", text: "目标任务", checked: true },
      { id: "item-2", text: "其他任务", checked: false },
    ]);
  });

  it("复制笔记支持调用方传入语言化标题后缀", () => {
    const source = note({ id: "copy-source", title: "Desktop App navigation" });

    const copied = duplicateNote(source, {
      now: baseTime + 1,
      id: "copy-target",
      titleSuffix: " Copy",
    });
    const defaultCopied = duplicateNote(source, {
      now: baseTime + 2,
      id: "copy-default",
    });

    expect(copied).toMatchObject({
      id: "copy-target",
      title: "Desktop App navigation Copy",
      createdAt: baseTime + 1,
      updatedAt: baseTime + 1,
    });
    expect(defaultCopied.title).toBe("Desktop App navigation");
  });

  it("从正文构建清单时复用拆行和勾选继承规则", () => {
    const checklist = buildChecklistItems(
      " 第一行 \n\n第二行\n第三行 ",
      "note-checklist",
      (text, index) => index === 1 && text === "第二行",
    );

    expect(checklist).toEqual([
      { id: "note-checklist-item-1", text: "第一行", checked: false },
      { id: "note-checklist-item-2", text: "第二行", checked: true },
      { id: "note-checklist-item-3", text: "第三行", checked: false },
    ]);
  });
});
