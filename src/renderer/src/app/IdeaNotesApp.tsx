// Idea Notes React 主界面。
// 作用：
// 1. 渲染自定义标题栏、侧边栏、筛选工具栏，并组合笔记卡片、编辑器和设置面板。
// 2. 通过拆分后的 hooks 编排数据、窗口、笔记、标签、设置和编辑器命令。
// 3. 将渲染层状态编排与拆分后的组件、工具函数、多语言文案连接起来。
import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { defaultSettings } from "@shared/defaultData";
import type { IdeaNote, NoteStatus } from "@shared/types";
import { AppShell } from "../components/shell/AppShell";
import { useIdeaNotesData } from "../hooks/useIdeaNotesData";
import { useNoteCommands } from "../hooks/useNoteCommands";
import { useNoteEditor } from "../hooks/useNoteEditor";
import { useNoteFilters } from "../hooks/useNoteFilters";
import { useSettingsCommands } from "../hooks/useSettingsCommands";
import { useSystemTheme } from "../hooks/useSystemTheme";
import { useTagCommands } from "../hooks/useTagCommands";
import { useWindowControls } from "../hooks/useWindowControls";
import { appCopy } from "../i18n";
import { AppMainContent } from "./AppMainContent";
import { AppOverlays } from "./AppOverlays";

type ViewMode = NoteStatus | "settings" | "tag-settings";

export default function App(): ReactElement {
  const {
    data,
    setData,
    isLoading,
    hasLoadError,
    isSaving,
    saveFeedback,
    setSaveFeedback,
    loadData,
    persist,
    runSavingTask,
    blockIfSaving,
  } = useIdeaNotesData();
  const systemPrefersDark = useSystemTheme();
  const {
    windowState,
    toggleAlwaysOnTop,
    minimizeWindow,
    toggleMaximizeWindow,
    closeWindow,
  } = useWindowControls();
  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<IdeaNote | null>(null);
  const [isClearTrashConfirmOpen, setIsClearTrashConfirmOpen] = useState(false);
  const [isResetSettingsConfirmOpen, setIsResetSettingsConfirmOpen] = useState(false);
  const currentLanguage = data?.settings.language ?? defaultSettings.language;
  const copy = appCopy[currentLanguage];

  useEffect(() => {
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage]);

  // 设置页和标签设置页会覆盖主内容区，但底层笔记列表仍保持进行中筛选状态。
  const noteViewMode: NoteStatus =
    viewMode === "settings" || viewMode === "tag-settings" ? "active" : viewMode;
  const notes = data?.notes ?? [];
  const {
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
  } = useNoteFilters({ notes, status: noteViewMode });
  const {
    draft,
    setDraft,
    isEditorOpen,
    setIsEditorOpen,
    editingNote,
    openNewNote,
    openExistingNote,
    handleSaveNote,
    toggleDraftTag,
  } = useNoteEditor({
    data,
    notes,
    copy,
    persist,
    blockIfSaving,
    setSaveFeedback,
    setViewMode: (status) => setViewMode(status),
  });
  const {
    tagName,
    tagInputError,
    setTagInputError,
    setTagName,
    handleAddTag,
    handleRenameTag,
    handleDeleteTag,
  } = useTagCommands({
    data,
    persist,
    setSelectedTags,
    setSaveFeedback,
  });
  const {
    handleMoveToTrash,
    handleRestore,
    handleDuplicateNote,
    handlePermanentDelete,
    handleClearTrash,
    handleToggleCompleted,
    handleToggleChecklist,
  } = useNoteCommands({
    data,
    persist,
    copy,
    setViewMode: (status) => setViewMode(status),
    setDeleteTarget,
    setIsClearTrashConfirmOpen,
  });
  const { handleSettingsChange, handleConfirmResetSettings, handleStartupChange } =
    useSettingsCommands({
      data,
      setData,
      runSavingTask,
      setIsResetSettingsConfirmOpen,
      persist,
    });

  function openSettings(): void {
    if (blockIfSaving(isEditorOpen ? "editor" : "main")) return;
    setSaveFeedback(null);
    setTagInputError(null);
    setIsEditorOpen(false);
    setViewMode("settings");
  }

  function openTagSettings(): void {
    if (blockIfSaving(isEditorOpen ? "editor" : "main")) return;
    setSaveFeedback(null);
    setTagInputError(null);
    setIsEditorOpen(false);
    setViewMode("tag-settings");
  }

  const counts = {
    active: notes.filter((note) => note.status === "active").length,
    completed: notes.filter((note) => note.status === "completed").length,
    trash: notes.filter((note) => note.status === "trash").length,
  };
  const isDarkTheme =
    data?.settings.themeMode === "dark" ||
    (data?.settings.themeMode === "system" && systemPrefersDark);
  const appClassName = isDarkTheme ? "app-window dark" : "app-window";
  const appBodyClassName = isSidebarCollapsed
    ? "app-body sidebar-collapsed"
    : "app-body";
  const pinButtonLabel = windowState.isAlwaysOnTop
    ? copy.cancelAlwaysOnTop
    : copy.alwaysOnTop;
  const sidebarToggleTitle = isSidebarCollapsed ? copy.expand : copy.collapse;
  const saveFeedbackMessage =
    saveFeedback?.kind === "failed"
      ? copy.saveFailed
      : saveFeedback?.kind === "busy"
        ? copy.saveBusy
        : null;
  const mainSaveFeedback = saveFeedback?.target === "main" ? saveFeedbackMessage : null;
  const editorSaveFeedback =
    saveFeedback?.target === "editor" ? saveFeedbackMessage : null;
  const tagInputErrorMessage =
    tagInputError === "required"
      ? copy.tagNameRequired
      : tagInputError === "duplicate"
        ? copy.tagAlreadyExists
        : null;
  const hasConfirmDialog =
    Boolean(deleteTarget) || isClearTrashConfirmOpen || isResetSettingsConfirmOpen;
  const shouldShowMainSaveError =
    Boolean(mainSaveFeedback) && viewMode !== "settings" && !hasConfirmDialog;

  return (
    <AppShell
      appClassName={appClassName}
      appBodyClassName={appBodyClassName}
      copy={copy}
      windowState={windowState}
      pinButtonLabel={pinButtonLabel}
      viewMode={viewMode}
      counts={counts}
      tags={data?.tags ?? []}
      selectedTags={selectedTags}
      mainContent={
        <AppMainContent
          viewMode={viewMode}
          data={data}
          copy={copy}
          currentLanguage={currentLanguage}
          tagName={tagName}
          tagInputErrorMessage={tagInputErrorMessage}
          mainSaveFeedback={mainSaveFeedback}
          shouldShowMainSaveError={shouldShowMainSaveError}
          isSaving={isSaving}
          searchQuery={searchQuery}
          priority={priority}
          sortMode={sortMode}
          noteViewMode={noteViewMode}
          visibleNotes={visibleNotes}
          hasData={Boolean(data)}
          isLoading={isLoading}
          hasLoadError={hasLoadError}
          trashCount={counts.trash}
          sidebarToggleTitle={sidebarToggleTitle}
          setTagName={setTagName}
          handleAddTag={handleAddTag}
          handleRenameTag={handleRenameTag}
          handleDeleteTag={handleDeleteTag}
          setSearchQuery={setSearchQuery}
          setPriority={setPriority}
          setSortMode={setSortMode}
          onToggleSidebar={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
          resetFilters={resetFilters}
          onClearTrash={() => setIsClearTrashConfirmOpen(true)}
          loadData={loadData}
          openExistingNote={openExistingNote}
          handleToggleCompleted={handleToggleCompleted}
          handleToggleChecklist={handleToggleChecklist}
          handleMoveToTrash={handleMoveToTrash}
          handleRestore={handleRestore}
          handleDuplicateNote={handleDuplicateNote}
          setDeleteTarget={setDeleteTarget}
        />
      }
      onToggleAlwaysOnTop={toggleAlwaysOnTop}
      onOpenSettings={openSettings}
      onMinimizeWindow={minimizeWindow}
      onToggleMaximizeWindow={toggleMaximizeWindow}
      onCloseWindow={closeWindow}
      onOpenNewNote={openNewNote}
      onViewModeChange={setViewMode}
      onToggleSelectedTag={toggleSelectedTag}
      onOpenTagSettings={openTagSettings}
    >
      <AppOverlays
        viewMode={viewMode}
        data={data}
        currentLanguage={currentLanguage}
        copy={copy}
        isSaving={isSaving}
        mainSaveFeedback={mainSaveFeedback}
        editorSaveFeedback={editorSaveFeedback}
        hasConfirmDialog={hasConfirmDialog}
        isResetSettingsConfirmOpen={isResetSettingsConfirmOpen}
        setIsResetSettingsConfirmOpen={setIsResetSettingsConfirmOpen}
        setSaveFeedback={setSaveFeedback}
        setViewMode={setViewMode}
        handleSettingsChange={handleSettingsChange}
        handleStartupChange={handleStartupChange}
        handleConfirmResetSettings={handleConfirmResetSettings}
        draft={draft}
        setDraft={setDraft}
        isEditorOpen={isEditorOpen}
        setIsEditorOpen={setIsEditorOpen}
        editingNote={editingNote}
        toggleDraftTag={toggleDraftTag}
        handleSaveNote={handleSaveNote}
        deleteTarget={deleteTarget}
        setDeleteTarget={setDeleteTarget}
        handlePermanentDelete={handlePermanentDelete}
        isClearTrashConfirmOpen={isClearTrashConfirmOpen}
        setIsClearTrashConfirmOpen={setIsClearTrashConfirmOpen}
        handleClearTrash={handleClearTrash}
      />
    </AppShell>
  );
}
