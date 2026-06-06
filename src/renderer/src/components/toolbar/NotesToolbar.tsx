// 笔记列表工具栏组件。
// 作用：
// 1. 承载搜索、优先级筛选、排序、筛选重置和回收站清空入口。
// 2. 保持工具栏 DOM、className 与 ARIA 结构稳定，让 App 只负责状态编排。
import type { ReactElement } from "react";
import type { RefObject } from "react";
import { ArrowCounterClockwiseIcon, TrashIcon } from "@phosphor-icons/react";
import type { NotePriority, NoteStatus, SortMode } from "@shared/types";
import { SidebarToggleIcon } from "../titlebar/TitlebarIcons";
import { AppButton } from "../ui/AppButton";
import type { AppCopy } from "../../i18n";

interface NotesToolbarProps {
  copy: AppCopy;
  searchInputRef: RefObject<HTMLInputElement | null>;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  priority: NotePriority | "all";
  onPriorityChange: (value: NotePriority | "all") => void;
  sortMode: SortMode;
  onSortModeChange: (value: SortMode) => void;
  noteViewMode: NoteStatus;
  trashCount: number;
  sidebarToggleTitle: string;
  onToggleSidebar: () => void;
  onResetFilters: () => void;
  onClearTrash: () => void;
}

export function NotesToolbar({
  copy,
  searchInputRef,
  searchQuery,
  onSearchQueryChange,
  priority,
  onPriorityChange,
  sortMode,
  onSortModeChange,
  noteViewMode,
  trashCount,
  sidebarToggleTitle,
  onToggleSidebar,
  onResetFilters,
  onClearTrash,
}: NotesToolbarProps): ReactElement {
  return (
    <section className="toolbar" aria-label={copy.toolbar}>
      <AppButton
        className="icon-btn sidebar-toggle"
        variant="icon"
        aria-label={copy.sidebarToggle}
        title={sidebarToggleTitle}
        icon={<SidebarToggleIcon />}
        onClick={onToggleSidebar}
      />
      <label className="search-field">
        <span>{copy.search}</span>
        <input
          ref={searchInputRef}
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder={copy.searchPlaceholder}
        />
      </label>
      <label className="toolbar-select-group">
        <span>{copy.priority}</span>
        <select
          className="priority-select"
          value={priority}
          onChange={(event) =>
            onPriorityChange(event.target.value as NotePriority | "all")
          }
        >
          <option value="all">{copy.all}</option>
          <option className="priority-option-high" value="high">
            {copy.priorityLabels.high}
          </option>
          <option className="priority-option-medium" value="medium">
            {copy.priorityLabels.medium}
          </option>
          <option className="priority-option-low" value="low">
            {copy.priorityLabels.low}
          </option>
        </select>
      </label>
      <label className="toolbar-select-group">
        <span>{copy.sort}</span>
        <select
          value={sortMode}
          onChange={(event) => onSortModeChange(event.target.value as SortMode)}
        >
          <option value="important">{copy.sortImportant}</option>
          <option value="newest">{copy.sortNewest}</option>
          <option value="progress">{copy.sortProgress}</option>
        </select>
      </label>
      <AppButton
        className="btn-subtle"
        icon={<ArrowCounterClockwiseIcon weight="bold" />}
        onClick={onResetFilters}
      >
        {copy.resetFilters}
      </AppButton>
      {noteViewMode === "trash" && trashCount > 0 && (
        <AppButton
          className="danger"
          icon={<TrashIcon weight="bold" />}
          onClick={onClearTrash}
        >
          {copy.clearTrash}
        </AppButton>
      )}
    </section>
  );
}
