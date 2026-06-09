// 笔记筛选和排序纯逻辑。
// 作用：
// 1. 按状态、优先级、标签和搜索词筛选笔记。
// 2. 按重要性、更新时间或完成进度排序。
import type { IdeaNote, NoteFilters } from "../types";
import { getCompletion } from "./checklistLogic";
import { parseSearchQuery } from "./searchQuery";

const priorityRank = {
  high: 0,
  medium: 1,
  low: 2,
} as const;

function getDueSearchStatus(note: IdeaNote): "overdue" | "pending" | "none" {
  if (!note.dueAt) return "none";
  const dueTime = Date.parse(note.dueAt);
  if (Number.isNaN(dueTime)) return "none";
  return dueTime < Date.now() ? "overdue" : "pending";
}

function includesSearchText(note: IdeaNote, query: string): boolean {
  const normalizedQuery = query.toLowerCase();
  if (!normalizedQuery) return true;
  return `${note.title}\n${note.body}\n${note.tags.join("\n")}`
    .toLowerCase()
    .includes(normalizedQuery);
}

export function filterAndSortNotes(
  notes: IdeaNote[],
  filters: NoteFilters,
): IdeaNote[] {
  // 先过滤视图状态，再叠加优先级、标签交集和文本搜索，最后按用户选择排序。
  const parsedQuery = parseSearchQuery(filters.searchQuery);
  return notes
    .filter((note) => note.status === filters.status)
    .filter((note) => filters.priority === "all" || note.priority === filters.priority)
    .filter((note) => filters.selectedTags.every((tag) => note.tags.includes(tag)))
    .filter((note) => parsedQuery.tags.every((tag) => note.tags.includes(tag)))
    .filter(
      (note) =>
        parsedQuery.priorities.length === 0 ||
        parsedQuery.priorities.includes(note.priority),
    )
    .filter(
      (note) =>
        parsedQuery.due === null || getDueSearchStatus(note) === parsedQuery.due,
    )
    .filter((note) => includesSearchText(note, parsedQuery.text))
    .sort((left, right) => {
      const leftPinned = !!left.pinned;
      const rightPinned = !!right.pinned;
      if (leftPinned && !rightPinned) return -1;
      if (!leftPinned && rightPinned) return 1;
      if (filters.sortMode === "newest") return right.updatedAt - left.updatedAt;
      if (filters.sortMode === "progress")
        return getCompletion(right).ratio - getCompletion(left).ratio;
      const priorityDelta = priorityRank[left.priority] - priorityRank[right.priority];
      return priorityDelta === 0 ? right.updatedAt - left.updatedAt : priorityDelta;
    });
}
