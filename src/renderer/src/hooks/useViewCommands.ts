// 视图切换命令 hook。
// 作用：
// 1. 将概览统计项点击映射成现有筛选状态。
// 2. 统一设置页、标签设置页和概览反向筛选的视图切换细节。
import type { Dispatch, SetStateAction } from "react";
import type { NotePriority, NoteStatus } from "@shared/types";
import type { AuxiliaryViewMode, ViewMode } from "../app/viewMode";

interface UseViewCommandsInput {
  blockIfSaving: (errorTarget: "main" | "editor") => boolean;
  isEditorOpen: boolean;
  setSaveFeedback: (feedback: null) => void;
  clearBackupFeedback: () => void;
  setTagInputError: (error: null) => void;
  setIsEditorOpen: Dispatch<SetStateAction<boolean>>;
  resetFilters: () => void;
  setPriority: Dispatch<SetStateAction<NotePriority | "all">>;
  setSelectedTags: Dispatch<SetStateAction<string[]>>;
  setViewMode: Dispatch<SetStateAction<ViewMode>>;
}

export function useViewCommands({
  blockIfSaving,
  isEditorOpen,
  setSaveFeedback,
  clearBackupFeedback,
  setTagInputError,
  setIsEditorOpen,
  resetFilters,
  setPriority,
  setSelectedTags,
  setViewMode,
}: UseViewCommandsInput): {
  openAuxiliaryView: (viewMode: AuxiliaryViewMode) => void;
  showStatsStatus: (status: NoteStatus) => void;
  showStatsPriority: (priority: NotePriority) => void;
  showStatsTag: (tag: string) => void;
} {
  function openAuxiliaryView(viewMode: AuxiliaryViewMode): void {
    if (blockIfSaving(isEditorOpen ? "editor" : "main")) return;
    setSaveFeedback(null);
    clearBackupFeedback();
    setTagInputError(null);
    setIsEditorOpen(false);
    setViewMode(viewMode);
  }

  function showStatsStatus(status: NoteStatus): void {
    resetFilters();
    setViewMode(status);
  }

  function showStatsPriority(priority: NotePriority): void {
    resetFilters();
    setPriority(priority);
    setViewMode("active");
  }

  function showStatsTag(tag: string): void {
    resetFilters();
    setSelectedTags([tag]);
    setViewMode("active");
  }

  return {
    openAuxiliaryView,
    showStatsStatus,
    showStatsPriority,
    showStatsTag,
  };
}
