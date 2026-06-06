// shared 业务逻辑测试。
// 作用：
// 1. 验证笔记创建时多行正文会转成清单项。
// 2. 验证列表筛选、标签交集、优先级和搜索排序规则。
// 3. 验证标签改名/删除会同步到每条笔记。
// 4. 验证回收站、恢复和彻底删除不会影响非目标笔记。
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultSettings } from "@shared/defaultData";
import {
  archiveNote,
  buildChecklistItems,
  calculateNoteStats,
  createNextTag,
  createTag,
  createNote,
  deleteTag,
  duplicateNote,
  ensureUniqueTagId,
  filterAndSortNotes,
  findDueReminders,
  getCompletion,
  markReminderNotified,
  moveNoteToTrash,
  permanentlyDeleteAllTrash,
  permanentlyDeleteNote,
  purgeExpiredTrash,
  parseSearchQuery,
  renameTag,
  restoreNoteFromTrash,
  restoreArchivedNote,
  toggleChecklistItem,
  toggleNoteCompleted,
  updateTagColor,
} from "@shared/noteLogic";
import type { IdeaNote, IdeaNotesData, IdeaSettings, IdeaTag } from "@shared/types";

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

describe("noteLogic", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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
      note({ id: "n1", title: "桌面窗口实现", body: "Electron", tags: ["工作"] }),
      note({ id: "n2", title: "阅读计划", body: "整理书单", tags: ["阅读"] }),
    ];

    const result = filterAndSortNotes(notes, {
      status: "active",
      selectedTags: [],
      priority: "all",
      searchQuery: "阅读",
      sortMode: "newest",
    });

    expect(result.map((item) => item.id)).toEqual(["n2"]);
  });

  it("按全局提醒设置找出应提醒笔记并跳过关闭、重复和非进行中状态", () => {
    const dueAt = "2026-05-29T09:00:00";
    const reminderKey = `due-target:${dueAt}:10`;
    const data: IdeaNotesData = {
      tags: [],
      settings: {
        ...defaultSettings,
        reminders: { enabled: true, leadMinutes: 10 },
      },
      notes: [
        note({
          id: "due-target",
          title: "即将截止",
          dueAt,
          priority: "high",
        }),
        note({
          id: "already-notified",
          title: "已经提醒",
          dueAt,
          notifiedReminderKeys: [`already-notified:${dueAt}:10`],
        }),
        note({
          id: "completed-note",
          title: "已完成不提醒",
          status: "completed",
          dueAt,
        }),
        note({
          id: "archive-note",
          title: "归档不提醒",
          status: "archive",
          dueAt,
        }),
        note({
          id: "trash-note",
          title: "回收站不提醒",
          status: "trash",
          dueAt,
        }),
        note({
          id: "future-note",
          title: "还没到提醒时间",
          dueAt: "2026-05-29T10:00:00",
        }),
      ],
    };

    const reminders = findDueReminders(data, Date.parse("2026-05-29T08:50:00"));
    const disabled = findDueReminders(
      {
        ...data,
        settings: {
          ...data.settings,
          reminders: { enabled: false, leadMinutes: 10 },
        },
      },
      Date.parse("2026-05-29T08:50:00"),
    );
    const marked = markReminderNotified(data, reminderKey);

    expect(reminders).toEqual([{ note: data.notes[0], key: reminderKey }]);
    expect(disabled).toEqual([]);
    expect(
      marked.notes.find((item) => item.id === "due-target")?.notifiedReminderKeys,
    ).toEqual([reminderKey]);
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
    const recolored = updateTagColor(data, "工作", "#10b981");
    const missing = updateTagColor(data, "不存在", "#111111");

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

  it("归档和恢复归档笔记只更新状态、更新时间并清理回收时间", () => {
    const completed = note({
      id: "archive-target",
      status: "completed",
      trashedAt: baseTime - 100,
    });

    const archived = archiveNote(completed, baseTime + 10);
    expect(archived.status).toBe("archive");
    expect(archived.updatedAt).toBe(baseTime + 10);
    expect(archived.trashedAt).toBeUndefined();

    const restored = restoreArchivedNote(archived, baseTime + 20);
    expect(restored.status).toBe("active");
    expect(restored.updatedAt).toBe(baseTime + 20);
    expect(restored.trashedAt).toBeUndefined();
  });

  it("归档笔记不会被 shared 完成态切换函数改回进行中或已完成", () => {
    const archived = note({
      id: "archive-complete-guard",
      status: "archive",
      updatedAt: baseTime,
    });

    const result = toggleNoteCompleted(archived, baseTime + 10);

    expect(result).toBe(archived);
    expect(result.status).toBe("archive");
    expect(result.updatedAt).toBe(baseTime);
  });

  it("清空回收站只删除全部回收站笔记", () => {
    const active = note({ id: "active-note", status: "active" });
    const completed = note({ id: "completed-note", status: "completed" });
    const trashed = note({ id: "trash-note", status: "trash" });

    const remaining = permanentlyDeleteAllTrash([active, trashed, completed]);

    expect(remaining.map((item) => item.id)).toEqual(["active-note", "completed-note"]);
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

  it("回收站笔记不会被 shared 完成态切换函数恢复为已完成", () => {
    const trashed = note({
      id: "trash-complete-guard",
      status: "trash",
      trashedAt: baseTime,
      updatedAt: baseTime,
    });

    const result = toggleNoteCompleted(trashed, baseTime + 10);

    expect(result).toBe(trashed);
    expect(result.status).toBe("trash");
    expect(result.updatedAt).toBe(baseTime);
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
      settings: {
        ...defaultSettings,
        trashAutoDelete: "invalid",
      } as unknown as IdeaSettings,
    };
    expect(purgeExpiredTrash(invalidRetentionData, now)).toBe(invalidRetentionData);
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
