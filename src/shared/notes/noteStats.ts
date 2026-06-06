// 笔记统计纯逻辑。
// 作用：
// 1. 汇总状态、优先级、标签和截止状态统计。
// 2. 为概览面板提供可测试的稳定数据来源。
import type { IdeaNote, NotePriority, NoteStatus } from "../types";

export interface NoteStats {
  total: number;
  completionRate: number;
  overdue: number;
  highPriority: number;
  statusCounts: Record<NoteStatus, number>;
  priorityCounts: Record<NotePriority, number>;
  topTags: Array<{ tag: string; count: number }>;
}

const initialStatusCounts: Record<NoteStatus, number> = {
  active: 0,
  completed: 0,
  archive: 0,
  trash: 0,
};

const initialPriorityCounts: Record<NotePriority, number> = {
  high: 0,
  medium: 0,
  low: 0,
};

function isOverdue(note: IdeaNote): boolean {
  if (!note.dueAt) return false;
  const dueTime = Date.parse(note.dueAt);
  return !Number.isNaN(dueTime) && dueTime < Date.now();
}

export function calculateNoteStats(notes: IdeaNote[]): NoteStats {
  const statusCounts = { ...initialStatusCounts };
  for (const note of notes) {
    statusCounts[note.status] += 1;
  }

  const scopedNotes = notes.filter((note) => note.status !== "trash");
  const priorityCounts = { ...initialPriorityCounts };
  const tagCounts = new Map<string, number>();
  for (const note of scopedNotes) {
    priorityCounts[note.priority] += 1;
    for (const tag of note.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const total = scopedNotes.length;
  const completed = scopedNotes.filter((note) => note.status === "completed").length;

  return {
    total,
    completionRate: total === 0 ? 0 : completed / total,
    overdue: scopedNotes.filter(isOverdue).length,
    highPriority: priorityCounts.high,
    statusCounts,
    priorityCounts,
    topTags: [...tagCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count })),
  };
}
