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
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import type { TagInputError } from "../hooks/useTagCommands";
import type { AppCopy } from "../i18n";
import { MainNotesView } from "./MainNotesView";
import { OverviewView } from "./OverviewView";
import { TagSettingsView } from "./TagSettingsView";
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
  backupFeedback: string | null;
  shouldShowMainSaveError: boolean;
  notificationFeedback: string | null;
  clipboardFeedback: string | null;
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
  onOpenShortcutHelp: () => void;
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
  handleTogglePin: (note: IdeaNote) => Promise<void>;
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
  handleCopyText: (text: string, kind: "title" | "body") => Promise<void>;
  handleExportNoteMarkdown: (noteId: string) => Promise<void>;
  handleExportVisibleMarkdown: (noteIds: string[]) => Promise<void>;
  handleImportMarkdownFiles: () => Promise<void>;
  handleImportDroppedMarkdownFiles: (filePaths: string[]) => Promise<void>;
  setDeleteTarget: (note: IdeaNote) => void;
  canCopyToClipboard: boolean;
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
  backupFeedback,
  shouldShowMainSaveError,
  notificationFeedback,
  clipboardFeedback,
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
  onOpenShortcutHelp,
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
  handleTogglePin,
  handleToggleChecklist,
  handleArchiveNote,
  handleMoveToTrash,
  handleRestore,
  handleRestoreArchivedNote,
  handleDuplicateNote,
  handleCopyText,
  handleExportNoteMarkdown,
  handleExportVisibleMarkdown,
  handleImportMarkdownFiles,
  handleImportDroppedMarkdownFiles,
  setDeleteTarget,
  canCopyToClipboard,
}: AppMainContentProps): ReactElement {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const visibleNoteIds = visibleNotes.map((note) => note.id);

  useKeyboardShortcuts({
    searchInputRef,
    isEditorOpen,
    isSaving,
    hasConfirmDialog,
    onOpenNewNote: openNewNote,
    onOpenShortcutHelp,
    onSaveEditor: handleSaveNote,
    onViewModeChange: setViewMode,
  });

  if (viewMode === "tag-settings") {
    return (
      <TagSettingsView
        data={data}
        copy={copy}
        tagName={tagName}
        tagInputError={tagInputError}
        mainSaveFeedback={mainSaveFeedback}
        isSaving={isSaving}
        setTagName={setTagName}
        handleAddTag={handleAddTag}
        handleRenameTag={handleRenameTag}
        handleTagColorChange={handleTagColorChange}
        handleDeleteTag={handleDeleteTag}
      />
    );
  }

  if (viewMode === "overview") {
    return (
      <OverviewView
        data={data}
        copy={copy}
        onStatsStatusClick={onStatsStatusClick}
        onStatsPriorityClick={onStatsPriorityClick}
        onStatsTagClick={onStatsTagClick}
      />
    );
  }

  return (
    <MainNotesView
      copy={copy}
      currentLanguage={currentLanguage}
      tags={tags}
      mainSaveFeedback={mainSaveFeedback}
      backupFeedback={noteViewMode === viewMode ? backupFeedback : null}
      shouldShowMainSaveError={shouldShowMainSaveError}
      notificationFeedback={notificationFeedback}
      clipboardFeedback={clipboardFeedback}
      searchInputRef={searchInputRef}
      searchQuery={searchQuery}
      priority={priority}
      sortMode={sortMode}
      noteViewMode={noteViewMode}
      visibleNotes={visibleNotes}
      visibleNoteIds={visibleNoteIds}
      hasData={hasData}
      isLoading={isLoading}
      hasLoadError={hasLoadError}
      trashCount={trashCount}
      sidebarToggleTitle={sidebarToggleTitle}
      setSearchQuery={setSearchQuery}
      setPriority={setPriority}
      setSortMode={setSortMode}
      onToggleSidebar={onToggleSidebar}
      resetFilters={resetFilters}
      onClearTrash={onClearTrash}
      loadData={loadData}
      openExistingNote={openExistingNote}
      handleToggleCompleted={handleToggleCompleted}
      handleTogglePin={handleTogglePin}
      handleToggleChecklist={handleToggleChecklist}
      handleArchiveNote={handleArchiveNote}
      handleMoveToTrash={handleMoveToTrash}
      handleRestore={handleRestore}
      handleRestoreArchivedNote={handleRestoreArchivedNote}
      handleDuplicateNote={handleDuplicateNote}
      handleCopyText={handleCopyText}
      handleExportNoteMarkdown={handleExportNoteMarkdown}
      handleExportVisibleMarkdown={handleExportVisibleMarkdown}
      handleImportMarkdownFiles={handleImportMarkdownFiles}
      handleImportDroppedMarkdownFiles={handleImportDroppedMarkdownFiles}
      setDeleteTarget={setDeleteTarget}
      canCopyToClipboard={canCopyToClipboard}
    />
  );
}
