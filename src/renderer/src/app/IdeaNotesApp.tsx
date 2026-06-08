// Idea Notes React 主界面。
// 作用：
// 1. 渲染自定义标题栏、侧边栏、筛选工具栏，并组合笔记卡片、编辑器和设置面板。
// 2. 通过拆分后的 hooks 编排数据、窗口、笔记、标签、设置和编辑器命令。
// 3. 将渲染层状态编排与拆分后的组件、工具函数、多语言文案连接起来。
import { useEffect, useState, type ReactElement } from "react";
import { defaultSettings } from "@shared/defaultData";
import type { IdeaNote } from "@shared/types";
import { AppShell } from "../components/shell/AppShell";
import { useDataBackupCommands } from "../hooks/useDataBackupCommands";
import { useIdeaNotesData } from "../hooks/useIdeaNotesData";
import { useNoteCommands } from "../hooks/useNoteCommands";
import { useNoteEditor } from "../hooks/useNoteEditor";
import { useNoteFilters } from "../hooks/useNoteFilters";
import { useSettingsCommands } from "../hooks/useSettingsCommands";
import { useSystemTheme } from "../hooks/useSystemTheme";
import { useTagCommands } from "../hooks/useTagCommands";
import { useViewCommands } from "../hooks/useViewCommands";
import { useWindowControls } from "../hooks/useWindowControls";
import { appCopy } from "../i18n";
import { AppMainContent } from "./AppMainContent";
import { AppOverlays } from "./AppOverlays";
import { getAppPresentationState } from "./appPresentation";
import { toNoteViewMode, type ViewMode } from "./viewMode";

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
    replaceData,
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
  const useAppWindowControls =
    data?.settings.appWindowControls ?? defaultSettings.appWindowControls;
  const copy = appCopy[currentLanguage];

  useEffect(() => {
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage]);

  const noteViewMode = toNoteViewMode(viewMode);
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
  const noteEditor = useNoteEditor({
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
    handleTagColorChange,
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
    handleArchiveNote,
    handleRestoreArchivedNote,
    handleDuplicateNote,
    handlePermanentDelete,
    handleClearTrash,
    handleToggleCompleted,
    handleTogglePin,
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
  const {
    backupFeedback,
    importConfirmMode,
    setImportConfirmMode,
    clearBackupFeedback,
    handleExportData,
    handleConfirmImportData,
  } = useDataBackupCommands({
    currentLanguage,
    replaceData,
    runSavingTask,
  });
  const viewCommands = useViewCommands({
    blockIfSaving,
    isEditorOpen: noteEditor.isEditorOpen,
    setSaveFeedback,
    clearBackupFeedback,
    setTagInputError,
    setIsEditorOpen: noteEditor.setIsEditorOpen,
    resetFilters,
    setPriority,
    setSelectedTags,
    setViewMode,
  });

  const {
    counts,
    appClassName,
    appBodyClassName,
    pinButtonLabel,
    sidebarToggleTitle,
    mainSaveFeedback,
    editorSaveFeedback,
    hasConfirmDialog,
    shouldShowMainSaveError,
  } = getAppPresentationState({
    data,
    systemPrefersDark,
    isSidebarCollapsed,
    windowState,
    copy,
    saveFeedback,
    viewMode,
    deleteTarget,
    isClearTrashConfirmOpen,
    isResetSettingsConfirmOpen,
    importConfirmMode,
  });

  return (
    <AppShell
      appClassName={appClassName}
      appBodyClassName={appBodyClassName}
      copy={copy}
      windowState={windowState}
      useAppWindowControls={useAppWindowControls}
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
          tags={data?.tags ?? []}
          tagName={tagName}
          tagInputError={tagInputError}
          mainSaveFeedback={mainSaveFeedback}
          shouldShowMainSaveError={shouldShowMainSaveError}
          isSaving={isSaving}
          isEditorOpen={noteEditor.isEditorOpen}
          hasConfirmDialog={hasConfirmDialog}
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
          handleTagColorChange={handleTagColorChange}
          handleDeleteTag={handleDeleteTag}
          openNewNote={noteEditor.openNewNote}
          handleSaveNote={noteEditor.handleSaveNote}
          setViewMode={(status) => setViewMode(status)}
          onStatsStatusClick={viewCommands.showStatsStatus}
          onStatsPriorityClick={viewCommands.showStatsPriority}
          onStatsTagClick={viewCommands.showStatsTag}
          setSearchQuery={setSearchQuery}
          setPriority={setPriority}
          setSortMode={setSortMode}
          onToggleSidebar={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
          resetFilters={resetFilters}
          onClearTrash={() => setIsClearTrashConfirmOpen(true)}
          loadData={loadData}
          openExistingNote={noteEditor.openExistingNote}
          handleToggleCompleted={handleToggleCompleted}
          handleTogglePin={handleTogglePin}
          handleToggleChecklist={handleToggleChecklist}
          handleArchiveNote={handleArchiveNote}
          handleMoveToTrash={handleMoveToTrash}
          handleRestore={handleRestore}
          handleRestoreArchivedNote={handleRestoreArchivedNote}
          handleDuplicateNote={handleDuplicateNote}
          setDeleteTarget={setDeleteTarget}
        />
      }
      onToggleAlwaysOnTop={toggleAlwaysOnTop}
      onOpenSettings={() => viewCommands.openAuxiliaryView("settings")}
      onMinimizeWindow={minimizeWindow}
      onToggleMaximizeWindow={toggleMaximizeWindow}
      onCloseWindow={closeWindow}
      onOpenNewNote={noteEditor.openNewNote}
      onViewModeChange={setViewMode}
      onToggleSelectedTag={toggleSelectedTag}
      onOpenTagSettings={() => viewCommands.openAuxiliaryView("tag-settings")}
    >
      <AppOverlays
        viewMode={viewMode}
        data={data}
        currentLanguage={currentLanguage}
        copy={copy}
        isSaving={isSaving}
        mainSaveFeedback={mainSaveFeedback}
        editorSaveFeedback={editorSaveFeedback}
        backupFeedback={backupFeedback}
        hasConfirmDialog={hasConfirmDialog}
        isResetSettingsConfirmOpen={isResetSettingsConfirmOpen}
        importConfirmMode={importConfirmMode}
        setIsResetSettingsConfirmOpen={setIsResetSettingsConfirmOpen}
        setImportConfirmMode={setImportConfirmMode}
        setSaveFeedback={setSaveFeedback}
        setViewMode={setViewMode}
        handleSettingsChange={handleSettingsChange}
        handleStartupChange={handleStartupChange}
        handleExportData={handleExportData}
        handleConfirmImportData={handleConfirmImportData}
        handleConfirmResetSettings={handleConfirmResetSettings}
        noteEditor={noteEditor}
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
