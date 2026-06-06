// 笔记状态计数工具。
// 作用：
// 1. 为侧栏状态导航提供各状态数量。
// 2. 让 App 主组件保持接线职责，不直接维护重复筛选计数。
import type { IdeaNote, NoteStatus } from "@shared/types";

export function countNotesByStatus(notes: IdeaNote[]): Record<NoteStatus, number> {
  return {
    active: notes.filter((note) => note.status === "active").length,
    completed: notes.filter((note) => note.status === "completed").length,
    archive: notes.filter((note) => note.status === "archive").length,
    trash: notes.filter((note) => note.status === "trash").length,
  };
}
