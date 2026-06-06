// 全局键盘快捷键 hook。
// 作用：
// 1. 集中处理新建、搜索聚焦、编辑器保存和视图切换快捷键。
// 2. 避免在输入文本时误触视图切换等破坏当前编辑上下文的动作。
import { useEffect } from "react";
import type { RefObject } from "react";
import type { NoteStatus } from "@shared/types";

interface UseKeyboardShortcutsInput {
  searchInputRef: RefObject<HTMLInputElement | null>;
  isEditorOpen: boolean;
  isSaving: boolean;
  hasConfirmDialog: boolean;
  onOpenNewNote: () => void;
  onSaveEditor: () => Promise<void>;
  onViewModeChange: (status: NoteStatus) => void;
}

function isTextInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

function isCommandKey(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.metaKey;
}

export function useKeyboardShortcuts({
  searchInputRef,
  isEditorOpen,
  isSaving,
  hasConfirmDialog,
  onOpenNewNote,
  onSaveEditor,
  onViewModeChange,
}: UseKeyboardShortcutsInput): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (!isCommandKey(event)) return;

      const key = event.key.toLowerCase();
      if (key === "f") {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (isEditorOpen && key === "s") {
        event.preventDefault();
        if (!isSaving) void onSaveEditor();
        return;
      }

      if (hasConfirmDialog || isEditorOpen || isTextInputTarget(event.target)) return;

      if (key === "n") {
        event.preventDefault();
        onOpenNewNote();
        return;
      }

      const statusByKey: Record<string, NoteStatus> = {
        "1": "active",
        "2": "completed",
        "3": "archive",
        "4": "trash",
      };
      const nextStatus = statusByKey[key];
      if (nextStatus) {
        event.preventDefault();
        onViewModeChange(nextStatus);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    hasConfirmDialog,
    isEditorOpen,
    isSaving,
    onOpenNewNote,
    onSaveEditor,
    onViewModeChange,
    searchInputRef,
  ]);
}
