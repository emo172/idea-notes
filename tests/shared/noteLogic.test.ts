// shared 业务逻辑测试。
// 作用：
// 1. 验证笔记创建时多行正文会转成清单项。
// 2. 验证列表筛选、标签交集、优先级和搜索排序规则。
// 3. 验证标签改名/删除会同步到每条笔记。
// 4. 验证回收站、恢复和彻底删除不会影响非目标笔记。
import { describe, expect, it } from "vitest";
import { defaultSettings } from "@shared/defaultData";
import {
  buildChecklistItems,
  createNote,
  deleteTag,
  duplicateNote,
  filterAndSortNotes,
  getCompletion,
  moveNoteToTrash,
  permanentlyDeleteAllTrash,
  permanentlyDeleteNote,
  purgeExpiredTrash,
  renameTag,
  restoreNoteFromTrash,
} from "@shared/noteLogic";
import type { IdeaNote, IdeaNotesData } from "@shared/types";

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

describe("noteLogic", () => {
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

  it("重命名与删除标签同步到笔记", () => {
    // 标签管理必须同步全局标签和笔记引用，否则筛选入口会与数据不一致。
    const data: IdeaNotesData = {
      tags: ["工作", "灵感", "待办"],
      settings: { ...defaultSettings },
      notes: [
        note({ id: "n1", tags: ["工作", "灵感"] }),
        note({ id: "n2", tags: ["待办"] }),
      ],
    };

    const renamed = renameTag(data, "工作", "项目");
    expect(renamed.tags).toEqual(["项目", "灵感", "待办"]);
    expect(renamed.notes.find((item) => item.id === "n1")?.tags).toEqual([
      "项目",
      "灵感",
    ]);

    const removed = deleteTag(renamed, "灵感");
    expect(removed.tags).toEqual(["项目", "待办"]);
    expect(removed.notes.find((item) => item.id === "n1")?.tags).toEqual([
      "项目",
    ]);
  });

  it("回收站流程只影响目标状态并支持彻底删除", () => {
    // 回收站状态变更和彻底删除分开验证，确保不会误删非目标笔记。
    const active = note({ id: "trash-target", status: "active" });
    const other = note({ id: "other", title: "其他笔记" });

    const trashed = moveNoteToTrash(active, baseTime + 10);
    expect(trashed.status).toBe("trash");
    expect(trashed.trashedAt).toBe(baseTime + 10);

    const restored = restoreNoteFromTrash(trashed, baseTime + 20);
    expect(restored.status).toBe("active");
    expect(restored.trashedAt).toBeUndefined();

    const remaining = permanentlyDeleteNote([trashed, other], "trash-target");
    expect(remaining.map((item) => item.id)).toEqual(["other"]);
  });

  it("清空回收站只删除全部回收站笔记", () => {
    const active = note({ id: "active-note", status: "active" });
    const completed = note({ id: "completed-note", status: "completed" });
    const trashed = note({ id: "trash-note", status: "trash" });

    const remaining = permanentlyDeleteAllTrash([active, trashed, completed]);

    expect(remaining.map((item) => item.id)).toEqual([
      "active-note",
      "completed-note",
    ]);
  });

  it("按回收站保留天数删除过期回收站笔记", () => {
    const now = baseTime + 10 * 86_400_000;
    const active = note({ id: "active-note", status: "active" });
    const missingTrashedAt = note({ id: "missing-trash-time", status: "trash" });
    const freshTrash = note({
      id: "fresh-trash",
      status: "trash",
      trashedAt: now - 6 * 86_400_000,
    });
    const expiredTrash = note({
      id: "expired-trash",
      status: "trash",
      trashedAt: now - 7 * 86_400_000,
    });
    const data: IdeaNotesData = {
      tags: [],
      settings: { ...defaultSettings, trashAutoDelete: "7" },
      notes: [active, missingTrashedAt, freshTrash, expiredTrash],
    };

    const cleaned = purgeExpiredTrash(data, now);

    expect(cleaned.notes.map((item) => item.id)).toEqual([
      "active-note",
      "missing-trash-time",
      "fresh-trash",
    ]);
    const neverData = { ...data, settings: defaultSettings };
    expect(purgeExpiredTrash(neverData, now)).toBe(neverData);
    const invalidRetentionData = {
      ...data,
      settings: { ...defaultSettings, trashAutoDelete: "invalid" },
    };
    expect(purgeExpiredTrash(invalidRetentionData, now)).toBe(
      invalidRetentionData,
    );
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
