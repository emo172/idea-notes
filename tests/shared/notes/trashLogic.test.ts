// 回收站与归档纯逻辑测试。
// 作用：
// 1. 验证移入回收站、恢复、彻底删除和清空回收站。
// 2. 验证删除前状态会被记录并用于恢复。
// 3. 验证归档笔记和回收站笔记不会被完成态切换错误改写。
import { describe, expect, it } from "vitest";
import { defaultSettings } from "../../../src/shared/defaultData";
import {
  archiveNote,
  restoreArchivedNote,
} from "../../../src/shared/notes/archiveLogic";
import {
  moveNoteToTrash,
  permanentlyDeleteAllTrash,
  permanentlyDeleteNote,
  purgeExpiredTrash,
  restoreNoteFromTrash,
  toggleNoteCompleted,
} from "../../../src/shared/notes/trashLogic";
import type { IdeaNote, IdeaNotesData, IdeaSettings } from "../../../src/shared/types";

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

describe("trashLogic", () => {
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

  it("从回收站恢复时回到删除前状态", () => {
    const completed = note({ id: "completed-trash", status: "completed" });
    const archived = note({ id: "archive-trash", status: "archive" });

    const trashedCompleted = moveNoteToTrash(completed, baseTime + 10);
    const trashedArchived = moveNoteToTrash(archived, baseTime + 10);
    const restoredCompleted = restoreNoteFromTrash(trashedCompleted, baseTime + 20);
    const restoredArchived = restoreNoteFromTrash(trashedArchived, baseTime + 20);

    expect(trashedCompleted.previousStatus).toBe("completed");
    expect(trashedArchived.previousStatus).toBe("archive");
    expect(restoredCompleted.status).toBe("completed");
    expect(restoredCompleted.previousStatus).toBeUndefined();
    expect(restoredArchived.status).toBe("archive");
    expect(restoredArchived.previousStatus).toBeUndefined();
  });

  it("旧回收站数据缺少删除前状态时恢复为进行中", () => {
    const legacyTrash = note({
      id: "legacy-trash",
      status: "trash",
      trashedAt: baseTime,
    });

    const restored = restoreNoteFromTrash(legacyTrash, baseTime + 10);

    expect(restored.status).toBe("active");
    expect(restored.trashedAt).toBeUndefined();
    expect(restored.previousStatus).toBeUndefined();
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
});
