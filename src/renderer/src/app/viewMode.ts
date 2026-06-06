// 应用视图模式类型。
// 作用：
// 1. 统一主内容、外壳和覆盖层之间的视图类型。
// 2. 避免重复声明联合类型导致 TypeScript 把同名类型视为无关类型。
import type { NoteStatus } from "@shared/types";

export type MainViewMode = NoteStatus | "overview";
export type AuxiliaryViewMode = "settings" | "tag-settings";
export type ViewMode = MainViewMode | AuxiliaryViewMode;

export function toNoteViewMode(viewMode: ViewMode): NoteStatus {
  return viewMode === "active" ||
    viewMode === "completed" ||
    viewMode === "archive" ||
    viewMode === "trash"
    ? viewMode
    : "active";
}
