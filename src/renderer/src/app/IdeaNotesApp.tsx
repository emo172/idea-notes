// Idea Notes React 主界面。
// 作用：
// 1. 渲染自定义标题栏、侧边栏、筛选工具栏，并组合笔记卡片、编辑器和设置面板。
// 2. 通过拆分后的 hooks 编排数据、窗口、笔记、标签、设置和编辑器命令。
// 3. 将渲染层状态编排与拆分后的组件、工具函数、多语言文案连接起来。
import { useEffect, useRef, useState, type ReactElement } from "react";
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
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false);
  const [notificationFeedback, setNotificationFeedback] = useState<string | null>(null);
  const [clipboardFeedback, setClipboardFeedback] = useState<string | null>(null);
  const currentLanguage = data?.settings.language ?? defaultSettings.language;
  const currentFontFamily =
    data?.settings.fontFamily ?? defaultSettings.fontFamily ?? "system";
  const currentFontSize = data?.settings.fontSize ?? defaultSettings.fontSize ?? 14;
  const useAppWindowControls =
    data?.settings.appWindowControls ?? defaultSettings.appWindowControls;
  const copy = appCopy[currentLanguage];

  useEffect(() => {
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage]);

  useEffect(() => {
    const rootStyle = document.documentElement.style;
    if (currentFontFamily === "system") {
      rootStyle.removeProperty("--app-font-family");
    } else {
      rootStyle.setProperty("--app-font-family", currentFontFamily);
    }
    rootStyle.setProperty("--app-font-size", `${currentFontSize}px`);
    return () => {
      rootStyle.removeProperty("--app-font-family");
      rootStyle.removeProperty("--app-font-size");
    };
  }, [currentFontFamily, currentFontSize]);

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

  // 通知点击处理：使用 ref 桥接避免空依赖闭包捕获过期 React 状态。
  const dataRef = useRef(data);
  dataRef.current = data;
  const openExistingNoteRef = useRef(noteEditor.openExistingNote);
  openExistingNoteRef.current = noteEditor.openExistingNote;
  const copyRef = useRef(copy);
  copyRef.current = copy;
  const hasFlushedPendingNotificationsRef = useRef(false);
  const handleNotificationClickRef = useRef((noteId: string) => {
    const notes = dataRef.current?.notes ?? [];
    const note = notes.find((n) => n.id === noteId);
    if (note && note.status !== "trash") {
      openExistingNoteRef.current(note);
    } else {
      setNotificationFeedback(copyRef.current.notificationNoteDeleted);
    }
  });
  handleNotificationClickRef.current = (noteId: string) => {
    const notes = dataRef.current?.notes ?? [];
    const note = notes.find((n) => n.id === noteId);
    if (note && note.status !== "trash") {
      openExistingNoteRef.current(note);
    } else {
      setNotificationFeedback(copyRef.current.notificationNoteDeleted);
    }
  };

  useEffect(() => {
    const unsub = window.ideaNotes.onNotificationClick?.((noteId) => {
      handleNotificationClickRef.current(noteId);
    });
    return () => {
      unsub?.();
    };
  }, []);

  useEffect(() => {
    if (!data || hasFlushedPendingNotificationsRef.current) return;
    void window.ideaNotes
      .flushPendingNotificationClicks()
      .then((noteIds) => {
        hasFlushedPendingNotificationsRef.current = true;
        noteIds.forEach((noteId) => handleNotificationClickRef.current(noteId));
      })
      .catch(() => {
        // 待发通知领取失败时保持未完成状态，后续挂载可再次重试。
      });
  }, [data]);

  useEffect(() => {
    if (!notificationFeedback) return;
    const timer = setTimeout(() => setNotificationFeedback(null), 5000);
    return () => clearTimeout(timer);
  }, [notificationFeedback]);

  useEffect(() => {
    if (!clipboardFeedback) return;
    const timer = setTimeout(() => setClipboardFeedback(null), 2500);
    return () => clearTimeout(timer);
  }, [clipboardFeedback]);

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
  async function handleCopyText(text: string, kind: "title" | "body"): Promise<void> {
    if (!window.ideaNotes.copyToClipboard) {
      setClipboardFeedback(copy.copyFailed);
      return;
    }
    try {
      await window.ideaNotes.copyToClipboard(text);
      setClipboardFeedback(
        kind === "title" ? copy.copyTitleSuccess : copy.copyBodySuccess,
      );
    } catch {
      setClipboardFeedback(copy.copyFailed);
    }
  }

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
          notificationFeedback={notificationFeedback}
          clipboardFeedback={clipboardFeedback}
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
          onOpenShortcutHelp={() => setIsShortcutHelpOpen(true)}
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
          handleCopyText={handleCopyText}
          setDeleteTarget={setDeleteTarget}
          canCopyToClipboard={Boolean(window.ideaNotes.copyToClipboard)}
        />
      }
      onToggleAlwaysOnTop={toggleAlwaysOnTop}
      onOpenSettings={() => viewCommands.openAuxiliaryView("settings")}
      onOpenShortcutHelp={() => setIsShortcutHelpOpen(true)}
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
        isShortcutHelpOpen={isShortcutHelpOpen}
        isResetSettingsConfirmOpen={isResetSettingsConfirmOpen}
        importConfirmMode={importConfirmMode}
        setIsResetSettingsConfirmOpen={setIsResetSettingsConfirmOpen}
        setImportConfirmMode={setImportConfirmMode}
        setSaveFeedback={setSaveFeedback}
        setViewMode={setViewMode}
        setIsShortcutHelpOpen={setIsShortcutHelpOpen}
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
