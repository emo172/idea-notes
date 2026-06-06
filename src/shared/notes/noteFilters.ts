// 笔记筛选和排序纯逻辑。
// 作用：
// 1. 按状态、优先级、标签和搜索词筛选笔记。
// 2. 按重要性、更新时间或完成进度排序。
import type { IdeaNote, NoteFilters } from "../types";
import { getCompletion } from "./checklistLogic";

const priorityRank = {
  high: 0,
  medium: 1,
  low: 2,
} as const;

// 搜索只匹配标题和正文，标签筛选由 selectedTags 单独处理，避免筛选语义混乱。
function includesSearchText(note: IdeaNote, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return `${note.title}\n${note.body}`.toLowerCase().includes(normalizedQuery);
}

export function filterAndSortNotes(
  notes: IdeaNote[],
  filters: NoteFilters,
): IdeaNote[] {
  // 先过滤视图状态，再叠加优先级、标签交集和文本搜索，最后按用户选择排序。
  return notes
    .filter((note) => note.status === filters.status)
    .filter((note) => filters.priority === "all" || note.priority === filters.priority)
    .filter((note) => filters.selectedTags.every((tag) => note.tags.includes(tag)))
    .filter((note) => includesSearchText(note, filters.searchQuery))
    .sort((left, right) => {
      if (filters.sortMode === "newest") return right.updatedAt - left.updatedAt;
      if (filters.sortMode === "progress")
        return getCompletion(right).ratio - getCompletion(left).ratio;
      const priorityDelta = priorityRank[left.priority] - priorityRank[right.priority];
      return priorityDelta === 0 ? right.updatedAt - left.updatedAt : priorityDelta;
    });
}
