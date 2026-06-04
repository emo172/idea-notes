// 笔记筛选状态 hook。
// 作用：
// 1. 集中管理搜索、优先级、排序和标签筛选状态。
// 2. 通过 shared 纯函数计算当前视图下可见的笔记列表。
// 3. 向 App 暴露筛选 setter、标签切换和重置能力，保持界面交互入口稳定。
import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { filterAndSortNotes } from "@shared/noteLogic";
import type {
  IdeaNote,
  NotePriority,
  NoteStatus,
  SortMode,
} from "@shared/types";

interface UseNoteFiltersInput {
  notes: IdeaNote[];
  status: NoteStatus;
}

interface UseNoteFiltersResult {
  visibleNotes: IdeaNote[];
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  priority: NotePriority | "all";
  setPriority: Dispatch<SetStateAction<NotePriority | "all">>;
  sortMode: SortMode;
  setSortMode: Dispatch<SetStateAction<SortMode>>;
  selectedTags: string[];
  setSelectedTags: Dispatch<SetStateAction<string[]>>;
  toggleSelectedTag: (tag: string) => void;
  resetFilters: () => void;
}

export function useNoteFilters({
  notes,
  status,
}: UseNoteFiltersInput): UseNoteFiltersResult {
  const [searchQuery, setSearchQuery] = useState("");
  const [priority, setPriority] = useState<NotePriority | "all">("all");
  const [sortMode, setSortMode] = useState<SortMode>("important");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const visibleNotes = useMemo(
    () =>
      filterAndSortNotes(notes, {
        status,
        searchQuery,
        priority,
        selectedTags,
        sortMode,
      }),
    [notes, status, searchQuery, priority, selectedTags, sortMode],
  );

  function toggleSelectedTag(tag: string): void {
    setSelectedTags((tags) =>
      tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag],
    );
  }

  function resetFilters(): void {
    setSearchQuery("");
    setPriority("all");
    setSortMode("important");
    setSelectedTags([]);
  }

  return {
    visibleNotes,
    searchQuery,
    setSearchQuery,
    priority,
    setPriority,
    sortMode,
    setSortMode,
    selectedTags,
    setSelectedTags,
    toggleSelectedTag,
    resetFilters,
  };
}
