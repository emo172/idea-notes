// 笔记归档纯逻辑。
// 作用：
// 1. 管理笔记进入归档区和从归档区恢复到进行中。
// 2. 保持归档状态流转不依赖 React、Electron 或持久化细节。
import type { IdeaNote } from "../types";

export function archiveNote(note: IdeaNote, now = Date.now()): IdeaNote {
  // 归档时清理回收站时间戳，避免归档笔记被回收站保留策略误处理。
  const { trashedAt: _trashedAt, ...rest } = note;
  return { ...rest, status: "archive", updatedAt: now };
}

export function restoreArchivedNote(note: IdeaNote, now = Date.now()): IdeaNote {
  const { trashedAt: _trashedAt, ...rest } = note;
  return { ...rest, status: "active", updatedAt: now };
}
