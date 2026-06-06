// App 主内容组合组件。
// 作用：
// 1. 按当前视图渲染标签设置页或笔记工具栏与列表。
// 2. 让 IdeaNotesApp 只负责状态来源和命令接线，不直接维护主内容 JSX。
import type { ReactElement } from "react";
import type {
  AppLanguage,
  IdeaNote,
  IdeaNotesData,
  NotePriority,
  NoteStatus,
  SortMode,
} from "@shared/types";
import { SaveFeedbackAlert } from "../components/feedback/SaveFeedbackAlert";
import { NotesList } from "../components/notes/NotesList";
import { TagSettingsPanel } from "../components/settings/TagSettingsPanel";
import { NotesToolbar } from "../components/toolbar/NotesToolbar";
import type { AppCopy } from "../i18n";

type ViewMode = NoteStatus | "settings" | "tag-settings";

interface AppMainContentProps {
  viewMode: ViewMode;
  data: IdeaNotesData | null;
  copy: AppCopy;
  currentLanguage: AppLanguage;
  tagName: string;
  tagInputErrorMessage: string | null;
  mainSaveFeedback: string | null;
  shouldShowMainSaveError: boolean;
  isSaving: boolean;
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
  handleDeleteTag: (tag: string) => Promise<void>;
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
  handleMoveToTrash: (note: IdeaNote) => Promise<void>;
  handleRestore: (note: IdeaNote) => Promise<void>;
  handleDuplicateNote: (note: IdeaNote) => Promise<void>;
  setDeleteTarget: (note: IdeaNote) => void;
}

export function AppMainContent({
  viewMode,
  data,
  copy,
  currentLanguage,
  tagName,
  tagInputErrorMessage,
  mainSaveFeedback,
  shouldShowMainSaveError,
  isSaving,
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
  handleDeleteTag,
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
  handleMoveToTrash,
  handleRestore,
  handleDuplicateNote,
  setDeleteTarget,
}: AppMainContentProps): ReactElement {
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
        onDeleteTag={handleDeleteTag}
      />
    );
  }

  return (
    <>
      <SaveFeedbackAlert message={shouldShowMainSaveError ? mainSaveFeedback : null} />
      <NotesToolbar
        copy={copy}
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
        noteViewMode={noteViewMode}
        visibleNotes={visibleNotes}
        hasData={hasData}
        isLoading={isLoading}
        hasLoadError={hasLoadError}
        onRetryLoad={() => loadData()}
        onOpenNote={openExistingNote}
        onToggleCompleted={handleToggleCompleted}
        onToggleChecklist={handleToggleChecklist}
        onTrash={handleMoveToTrash}
        onRestore={handleRestore}
        onDuplicate={handleDuplicateNote}
        onDelete={setDeleteTarget}
      />
    </>
  );
}
