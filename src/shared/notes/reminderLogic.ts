// 截止提醒纯逻辑。
// 作用：
// 1. 根据全局提醒设置和当前时间计算应触发提醒的笔记。
// 2. 生成稳定 reminder key，避免同一截止时间和提前量重复提醒。
import type { IdeaNote, IdeaNotesData } from "../types";

export interface DueReminder {
  note: IdeaNote;
  key: string;
}

export function buildReminderKey(note: IdeaNote, leadMinutes: number): string {
  return `${note.id}:${note.dueAt ?? ""}:${leadMinutes}`;
}

export function findDueReminders(data: IdeaNotesData, now: number): DueReminder[] {
  const { reminders } = data.settings;
  if (!reminders.enabled) return [];

  const leadMs = reminders.leadMinutes * 60_000;
  return data.notes.flatMap((note) => {
    if (note.status !== "active" || !note.dueAt) return [];
    const dueTime = Date.parse(note.dueAt);
    if (Number.isNaN(dueTime)) return [];
    const reminderTime = dueTime - leadMs;
    if (now < reminderTime) return [];
    const key = buildReminderKey(note, reminders.leadMinutes);
    if (note.notifiedReminderKeys?.includes(key)) return [];
    return [{ note, key }];
  });
}

export function markReminderNotified(
  data: IdeaNotesData,
  reminderKey: string,
): IdeaNotesData {
  return {
    ...data,
    notes: data.notes.map((note) =>
      reminderKey.startsWith(`${note.id}:`)
        ? {
            ...note,
            notifiedReminderKeys: [
              ...new Set([...(note.notifiedReminderKeys ?? []), reminderKey]),
            ],
          }
        : note,
    ),
  };
}
