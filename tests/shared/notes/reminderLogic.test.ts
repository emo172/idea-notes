// 截止提醒纯逻辑测试。
// 作用：
// 1. 验证全局提醒设置会筛出到期的进行中笔记。
// 2. 验证关闭提醒、已提醒和非进行中状态不会重复触发。
// 3. 验证提醒标记写回对应笔记的稳定 key。
import { describe, expect, it } from "vitest";
import { defaultSettings } from "../../../src/shared/defaultData";
import {
  findDueReminders,
  markReminderNotified,
} from "../../../src/shared/notes/reminderLogic";
import type { IdeaNote, IdeaNotesData } from "../../../src/shared/types";

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

describe("reminderLogic", () => {
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
});
