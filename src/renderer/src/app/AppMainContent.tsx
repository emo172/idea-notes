// App 主内容组合组件。
// 作用：
// 1. 按当前视图渲染标签设置页或笔记工具栏与列表。
// 2. 让 IdeaNotesApp 只负责状态来源和命令接线，不直接维护主内容 JSX。
import { useRef } from "react";
import type { ReactElement } from "react";
import type {
  AppLanguage,
  IdeaNote,
  IdeaNotesData,
  IdeaTag,
  NotePriority,
  NoteStatus,
  SortMode,
} from "@shared/types";
import { SaveFeedbackAlert } from "../components/feedback/SaveFeedbackAlert";
import { NotesList } from "../components/notes/NotesList";
import { StatsPanel } from "../components/overview/StatsPanel";
import { TagSettingsPanel } from "../components/settings/TagSettingsPanel";
import { NotesToolbar } from "../components/toolbar/NotesToolbar";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import type { TagInputError } from "../hooks/useTagCommands";
import type { AppCopy } from "../i18n";
import type { ViewMode } from "./viewMode";

interface AppMainContentProps {
  viewMode: ViewMode;
  data: IdeaNotesData | null;
  copy: AppCopy;
  currentLanguage: AppLanguage;
  tags: IdeaTag[];
  tagName: string;
  tagInputError: TagInputError | null;
  mainSaveFeedback: string | null;
  shouldShowMainSaveError: boolean;
  isSaving: boolean;
  isEditorOpen: boolean;
  hasConfirmDialog: boolean;
  searchQuery: string;
  priority: NotePriority | "all";
  sortMode: SortMode;
  noteViewMode: NoteStatus;
  visibleNotes: IdeaNote[];
  hasData: boolean;
  isLoading: boolean;
  hasLoadError: boolean;
  trashCount: number;
  sidebarToggleTitle: string;
  setTagName: (value: string) => void;
  handleAddTag: () => Promise<boolean>;
  handleRenameTag: (from: string, to: string) => Promise<boolean>;
  handleTagColorChange: (tag: string, color: string) => Promise<boolean>;
  handleDeleteTag: (tag: string) => Promise<void>;
  openNewNote: () => void;
  handleSaveNote: () => Promise<void>;
  setViewMode: (status: NoteStatus) => void;
  onStatsStatusClick: (status: NoteStatus) => void;
  onStatsPriorityClick: (priority: NotePriority) => void;
  onStatsTagClick: (tag: string) => void;
  setSearchQuery: (value: string) => void;
  setPriority: (value: NotePriority | "all") => void;
  setSortMode: (value: SortMode) => void;
  onToggleSidebar: () => void;
  resetFilters: () => void;
  onClearTrash: () => void;
  loadData: () => Promise<void>;
  openExistingNote: (note: IdeaNote) => void;
  handleToggleCompleted: (note: IdeaNote) => Promise<void>;
  handleToggleChecklist: (
    note: IdeaNote,
    itemId: string,
    checked: boolean,
  ) => Promise<void>;
  handleArchiveNote: (note: IdeaNote) => Promise<void>;
  handleMoveToTrash: (note: IdeaNote) => Promise<void>;
  handleRestore: (note: IdeaNote) => Promise<void>;
  handleRestoreArchivedNote: (note: IdeaNote) => Promise<void>;
  handleDuplicateNote: (note: IdeaNote) => Promise<void>;
  setDeleteTarget: (note: IdeaNote) => void;
}

export function AppMainContent({
  viewMode,
  data,
  copy,
  currentLanguage,
  tags,
  tagName,
  tagInputError,
  mainSaveFeedback,
  shouldShowMainSaveError,
  isSaving,
  isEditorOpen,
  hasConfirmDialog,
  searchQuery,
  priority,
  sortMode,
  noteViewMode,
  visibleNotes,
  hasData,
  isLoading,
  hasLoadError,
  trashCount,
  sidebarToggleTitle,
  setTagName,
  handleAddTag,
  handleRenameTag,
  handleTagColorChange,
  handleDeleteTag,
  openNewNote,
  handleSaveNote,
  setViewMode,
  onStatsStatusClick,
  onStatsPriorityClick,
  onStatsTagClick,
  setSearchQuery,
  setPriority,
  setSortMode,
  onToggleSidebar,
  resetFilters,
  onClearTrash,
  loadData,
  openExistingNote,
  handleToggleCompleted,
  handleToggleChecklist,
  handleArchiveNote,
  handleMoveToTrash,
  handleRestore,
  handleRestoreArchivedNote,
  handleDuplicateNote,
  setDeleteTarget,
}: AppMainContentProps): ReactElement {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const tagInputErrorMessage =
    tagInputError === "required"
      ? copy.tagNameRequired
      : tagInputError === "duplicate"
        ? copy.tagAlreadyExists
        : null;

  useKeyboardShortcuts({
    searchInputRef,
    isEditorOpen,
    isSaving,
    hasConfirmDialog,
    onOpenNewNote: openNewNote,
    onSaveEditor: handleSaveNote,
    onViewModeChange: setViewMode,
  });

  if (viewMode === "tag-settings") {
    return (
      <TagSettingsPanel
        data={data}
        copy={copy}
        tagName={tagName}
        tagInputError={tagInputErrorMessage}
        tagSaveFeedback={mainSaveFeedback}
        isSaving={isSaving}
        setTagName={setTagName}
        onAddTag={handleAddTag}
        onRenameTag={handleRenameTag}
        onTagColorChange={handleTagColorChange}
        onDeleteTag={handleDeleteTag}
      />
    );
  }

  if (viewMode === "overview") {
    return (
      <StatsPanel
        notes={data?.notes ?? []}
        copy={copy}
        onStatusClick={onStatsStatusClick}
        onPriorityClick={onStatsPriorityClick}
        onTagClick={onStatsTagClick}
      />
    );
  }

  return (
    <>
      <SaveFeedbackAlert message={shouldShowMainSaveError ? mainSaveFeedback : null} />
      <NotesToolbar
        copy={copy}
        searchInputRef={searchInputRef}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        priority={priority}
        onPriorityChange={setPriority}
        sortMode={sortMode}
        onSortModeChange={setSortMode}
        noteViewMode={noteViewMode}
        trashCount={trashCount}
        sidebarToggleTitle={sidebarToggleTitle}
        onToggleSidebar={onToggleSidebar}
        onResetFilters={resetFilters}
        onClearTrash={onClearTrash}
      />
      <NotesList
        copy={copy}
        language={currentLanguage}
        tags={tags}
        searchQuery={searchQuery}
        noteViewMode={noteViewMode}
        visibleNotes={visibleNotes}
        hasData={hasData}
        isLoading={isLoading}
        hasLoadError={hasLoadError}
        onRetryLoad={() => loadData()}
        onOpenNote={openExistingNote}
        onToggleCompleted={handleToggleCompleted}
        onToggleChecklist={handleToggleChecklist}
        onArchive={handleArchiveNote}
        onTrash={handleMoveToTrash}
        onRestore={handleRestore}
        onRestoreArchived={handleRestoreArchivedNote}
        onDuplicate={handleDuplicateNote}
        onDelete={setDeleteTarget}
      />
    </>
  );
}
