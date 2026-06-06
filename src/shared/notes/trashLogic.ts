// 笔记回收站纯逻辑。
// 作用：
// 1. 管理笔记移入回收站、恢复和彻底删除。
// 2. 按回收站保留天数清理过期笔记。
import type { IdeaNote, IdeaNotesData } from "../types";

const dayInMs = 86_400_000;

export function purgeExpiredTrash(
  data: IdeaNotesData,
  now = Date.now(),
): IdeaNotesData {
  // 回收站自动清理只消费明确的天数设置；never 和缺失 trashedAt 都保留原数据。
  if (data.settings.trashAutoDelete === "never") return data;

  const retentionDays = Number(data.settings.trashAutoDelete);
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) return data;
  const retentionMs = retentionDays * dayInMs;
  const notes = data.notes.filter(
    (note) =>
      note.status !== "trash" ||
      note.trashedAt === undefined ||
      note.trashedAt > now - retentionMs,
  );

  return notes.length === data.notes.length ? data : { ...data, notes };
}

export function toggleNoteCompleted(note: IdeaNote, now = Date.now()): IdeaNote {
  // 完成态和进行中互相切换；归档和回收站笔记不会在 UI 中触发这个动作。
  if (note.status === "trash" || note.status === "archive") return note;
  return {
    ...note,
    status: note.status === "completed" ? "active" : "completed",
    updatedAt: now,
  };
}

export function moveNoteToTrash(note: IdeaNote, now = Date.now()): IdeaNote {
  // 移入回收站时保留全部内容，并记录 trashedAt 供后续保留时间策略使用。
  return { ...note, status: "trash", updatedAt: now, trashedAt: now };
}

export function restoreNoteFromTrash(note: IdeaNote, now = Date.now()): IdeaNote {
  // 从回收站恢复时回到进行中，并移除回收时间戳。
  const { trashedAt: _trashedAt, ...rest } = note;
  return { ...rest, status: "active", updatedAt: now };
}

export function permanentlyDeleteNote(notes: IdeaNote[], noteId: string): IdeaNote[] {
  // 彻底删除是唯一从 notes 数组移除元素的动作。
  return notes.filter((note) => note.id !== noteId);
}

export function permanentlyDeleteAllTrash(notes: IdeaNote[]): IdeaNote[] {
  // 清空回收站只移除回收站笔记，避免误删进行中和已完成内容。
  return notes.filter((note) => note.status !== "trash");
}
