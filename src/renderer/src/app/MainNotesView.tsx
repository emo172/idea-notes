// 主笔记列表视图组件。
// 作用：
// 1. 承载普通笔记分支中的保存反馈、工具栏和笔记列表。
// 2. 保持搜索输入引用由 AppMainContent 统一创建，避免重复注册快捷键。
import type { ReactElement, RefObject } from "react";
import type {
  AppLanguage,
  IdeaNote,
  IdeaTag,
  NotePriority,
  NoteStatus,
  SortMode,
} from "@shared/types";
import { NotesList } from "../components/notes/NotesList";
import { NotesToolbar } from "../components/toolbar/NotesToolbar";
import { SaveFeedbackAlert } from "../components/feedback/SaveFeedbackAlert";
import type { AppCopy } from "../i18n";

interface MainNotesViewProps {
  copy: AppCopy;
  currentLanguage: AppLanguage;
  tags: IdeaTag[];
  mainSaveFeedback: string | null;
  backupFeedback: string | null;
  shouldShowMainSaveError: boolean;
  notificationFeedback: string | null;
  clipboardFeedback: string | null;
  searchInputRef: RefObject<HTMLInputElement | null>;
  searchQuery: string;
  priority: NotePriority | "all";
  sortMode: SortMode;
  noteViewMode: NoteStatus;
  visibleNotes: IdeaNote[];
  visibleNoteIds: string[];
  hasData: boolean;
  isLoading: boolean;
  hasLoadError: boolean;
  trashCount: number;
  sidebarToggleTitle: string;
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

export function MainNotesView({
  copy,
  currentLanguage,
  tags,
  mainSaveFeedback,
  backupFeedback,
  shouldShowMainSaveError,
  notificationFeedback,
  clipboardFeedback,
  searchInputRef,
  searchQuery,
  priority,
  sortMode,
  noteViewMode,
  visibleNotes,
  visibleNoteIds,
  hasData,
  isLoading,
  hasLoadError,
  trashCount,
  sidebarToggleTitle,
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
}: MainNotesViewProps): ReactElement {
  return (
    <>
      <SaveFeedbackAlert message={shouldShowMainSaveError ? mainSaveFeedback : null} />
      <SaveFeedbackAlert message={notificationFeedback} />
      <SaveFeedbackAlert message={clipboardFeedback} />
      <SaveFeedbackAlert message={backupFeedback} />
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
        onExportVisibleMarkdown={() => handleExportVisibleMarkdown(visibleNoteIds)}
        onImportMarkdownFiles={handleImportMarkdownFiles}
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
        onTogglePin={handleTogglePin}
        onToggleChecklist={handleToggleChecklist}
        onArchive={handleArchiveNote}
        onTrash={handleMoveToTrash}
        onRestore={handleRestore}
        onRestoreArchived={handleRestoreArchivedNote}
        onDuplicate={handleDuplicateNote}
        onCopyText={handleCopyText}
        onDropMarkdownFiles={handleImportDroppedMarkdownFiles}
        onExportNoteMarkdown={handleExportNoteMarkdown}
        onDelete={setDeleteTarget}
        canCopyToClipboard={canCopyToClipboard}
      />
    </>
  );
}
