// Idea Notes React 主界面。
// 作用：
// 1. 渲染自定义标题栏、侧边栏、筛选工具栏，并组合笔记卡片、编辑器和设置面板。
// 2. 通过 window.ideaNotes 从 Electron 主进程加载和保存本地数据。
// 3. 调用 shared 纯函数处理筛选排序、标签同步和回收站状态。
// 4. 将渲染层状态编排与拆分后的组件、工具函数、多语言文案连接起来。
import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { defaultSettings } from "@shared/defaultData";
import {
  deleteTag,
  duplicateNote,
  moveNoteToTrash,
  permanentlyDeleteAllTrash,
  permanentlyDeleteNote,
  renameTag,
  restoreNoteFromTrash,
  saveNote,
  toggleChecklistItem,
  toggleNoteCompleted,
  updateSettings,
} from "@shared/noteLogic";
import type {
  DesktopWindowState,
  IdeaNote,
  IdeaNotesData,
  NoteDraft,
  NoteStatus,
} from "@shared/types";
import { ConfirmDialog } from "../components/dialogs/ConfirmDialog";
import { EditorDialog } from "../components/editor/EditorDialog";
import { NotesList } from "../components/notes/NotesList";
import { AppShell } from "../components/shell/AppShell";
import { SettingsPanel } from "../components/settings/SettingsPanel";
import { TagSettingsPanel } from "../components/settings/TagSettingsPanel";
import { NotesToolbar } from "../components/toolbar/NotesToolbar";
import { useIdeaNotesData } from "../hooks/useIdeaNotesData";
import { useNoteFilters } from "../hooks/useNoteFilters";
import { useSystemTheme } from "../hooks/useSystemTheme";
import { appCopy, settingsCopy } from "../i18n";
import {
  buildDraftFromNote,
  draftToUpdatedNote,
  initialDraft,
} from "../utils/noteDraft";

type ViewMode = NoteStatus | "settings" | "tag-settings";
type TagInputError = "required" | "duplicate";

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
  const [tagInputError, setTagInputError] = useState<TagInputError | null>(
    null,
  );
  const systemPrefersDark = useSystemTheme();
  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const [draft, setDraft] = useState<NoteDraft>(initialDraft);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<IdeaNote | null>(null);
  const [isClearTrashConfirmOpen, setIsClearTrashConfirmOpen] = useState(false);
  const [isResetSettingsConfirmOpen, setIsResetSettingsConfirmOpen] =
    useState(false);
  const [tagName, setTagName] = useState("");
  const [windowState, setWindowState] = useState<DesktopWindowState>({
    isAlwaysOnTop: false,
    isMaximized: false,
  });
  const currentLanguage = data?.settings.language ?? defaultSettings.language;
  const copy = appCopy[currentLanguage];

  useEffect(() => {
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage]);

  useEffect(() => {
    let mounted = true;
    void window.ideaNotes
      .getWindowState()
      .then((state) => {
        if (mounted) setWindowState(state);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  // 设置页和标签设置页会覆盖主内容区，但底层笔记列表仍保持进行中筛选状态。
  const noteViewMode: NoteStatus =
    viewMode === "settings" || viewMode === "tag-settings"
      ? "active"
      : viewMode;
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

  function openNewNote(): void {
    if (blockIfSaving(isEditorOpen ? "editor" : "main")) return;
    setSaveFeedback(null);
    setDraft(initialDraft);
    setIsEditorOpen(true);
  }

  function openExistingNote(note: IdeaNote): void {
    if (blockIfSaving(isEditorOpen ? "editor" : "main")) return;
    setSaveFeedback(null);
    setDraft(buildDraftFromNote(note));
    setIsEditorOpen(true);
  }

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

  async function handleSaveNote(): Promise<void> {
    if (!data) return;
    const normalizedDraft: NoteDraft = {
      ...draft,
      title: draft.title.trim() || copy.unnamedNote,
    };
    // draft.id 存在表示编辑已有笔记；不存在则走新建流程并插入列表顶部。
    const nextData = draft.id
      ? {
          ...data,
          notes: data.notes.map((note) =>
            note.id === draft.id
              ? draftToUpdatedNote(note, normalizedDraft, copy.unnamedNote)
              : note,
          ),
        }
      : saveNote(data, normalizedDraft);
    const didSave = await persist(nextData, "editor");
    if (!didSave) return;
    setIsEditorOpen(false);
    setDraft(initialDraft);
    setViewMode("active");
  }

  async function updateNote(note: IdeaNote): Promise<boolean> {
    if (!data) return false;
    return persist({
      ...data,
      notes: data.notes.map((item) => (item.id === note.id ? note : item)),
    });
  }

  async function handleMoveToTrash(note: IdeaNote): Promise<void> {
    await updateNote(moveNoteToTrash(note));
  }

  async function handleRestore(note: IdeaNote): Promise<void> {
    await updateNote(restoreNoteFromTrash(note));
  }

  async function handleDuplicateNote(note: IdeaNote): Promise<void> {
    if (!data) return;
    const copiedNote = duplicateNote(note, {
      titleSuffix: copy.duplicateTitleSuffix,
    });
    const didSave = await persist({
      ...data,
      notes: [copiedNote, ...data.notes],
    });
    if (!didSave) return;
    setViewMode(copiedNote.status);
  }

  async function handlePermanentDelete(noteId: string): Promise<void> {
    if (!data) return;
    const didSave = await persist({
      ...data,
      notes: permanentlyDeleteNote(data.notes, noteId),
    });
    if (!didSave) return;
    setDeleteTarget(null);
  }

  async function handleClearTrash(): Promise<void> {
    if (!data) return;
    const didSave = await persist({
      ...data,
      notes: permanentlyDeleteAllTrash(data.notes),
    });
    if (!didSave) return;
    setIsClearTrashConfirmOpen(false);
  }

  async function handleAddTag(): Promise<boolean> {
    if (!data) return false;
    const nextTag = tagName.trim();
    setSaveFeedback(null);
    if (!nextTag) {
      setTagInputError("required");
      return false;
    }
    if (data.tags.includes(nextTag)) {
      setTagInputError("duplicate");
      return false;
    }
    setTagInputError(null);
    const didSave = await persist({ ...data, tags: [...data.tags, nextTag] });
    if (!didSave) return false;
    setTagName("");
    return true;
  }

  async function handleRenameTag(from: string, to: string): Promise<boolean> {
    if (!data) return false;
    const nextTag = to.trim();
    setSaveFeedback(null);
    if (!nextTag) {
      setTagInputError("required");
      return false;
    }
    if (nextTag === from) {
      setTagInputError(null);
      return true;
    }
    if (data.tags.includes(nextTag)) {
      setTagInputError("duplicate");
      return false;
    }
    setTagInputError(null);
    const didSave = await persist(renameTag(data, from, nextTag));
    if (!didSave) return false;
    setSelectedTags((tags) =>
      tags.map((item) => (item === from ? nextTag : item)),
    );
    setTagInputError(null);
    return true;
  }

  async function handleDeleteTag(tag: string): Promise<void> {
    if (!data) return;
    setSaveFeedback(null);
    setTagInputError(null);
    const didSave = await persist(deleteTag(data, tag));
    if (!didSave) return;
    setSelectedTags((tags) => tags.filter((item) => item !== tag));
  }

  async function handleSettingsChange(
    settings: Partial<IdeaNotesData["settings"]>,
  ): Promise<void> {
    if (!data) return;
    const nextData = updateSettings(data, settings);
    await persist(nextData);
  }

  async function handleConfirmResetSettings(): Promise<void> {
    if (!data) return;
    const previousStartup = data.settings.startup;
    const didSave = await runSavingTask("main", async () => {
      const startup = await window.ideaNotes.setStartup(defaultSettings.startup);
      const resetData = updateSettings(data, {
        ...defaultSettings,
        startup,
      });
      try {
        const savedResetData = await window.ideaNotes.saveData(resetData);
        setData(savedResetData);
      } catch (error) {
        await window.ideaNotes.setStartup(previousStartup);
        throw error;
      }
    });
    if (didSave) setIsResetSettingsConfirmOpen(false);
  }

  async function handleStartupChange(enabled: boolean): Promise<void> {
    if (!data) return;
    const previousStartup = data.settings.startup;
    await runSavingTask("main", async () => {
      const startup = await window.ideaNotes.setStartup(enabled);
      try {
        const saved = await window.ideaNotes.saveData(
          updateSettings(data, { startup }),
        );
        setData(saved);
      } catch (error) {
        await window.ideaNotes.setStartup(previousStartup);
        throw error;
      }
    });
  }

  function toggleDraftTag(tag: string): void {
    setDraft((currentDraft) => ({
      ...currentDraft,
      tags: currentDraft.tags.includes(tag)
        ? currentDraft.tags.filter((item) => item !== tag)
        : [...currentDraft.tags, tag],
    }));
  }

  const editingNote = notes.find((note) => note.id === draft.id);
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
  const mainSaveFeedback =
    saveFeedback?.target === "main" ? saveFeedbackMessage : null;
  const editorSaveFeedback =
    saveFeedback?.target === "editor" ? saveFeedbackMessage : null;
  const tagInputErrorMessage =
    tagInputError === "required"
      ? copy.tagNameRequired
      : tagInputError === "duplicate"
        ? copy.tagAlreadyExists
        : null;
  const hasConfirmDialog =
    Boolean(deleteTarget) ||
    isClearTrashConfirmOpen ||
    isResetSettingsConfirmOpen;
  const shouldShowMainSaveError =
    mainSaveFeedback && viewMode !== "settings" && !hasConfirmDialog;

  const mainContent =
    viewMode === "tag-settings" ? (
      <TagSettingsPanel
        data={data}
        copy={copy}
        tagName={tagName}
        tagInputError={tagInputErrorMessage}
        tagSaveFeedback={mainSaveFeedback}
        isSaving={isSaving}
        setTagName={(value) => {
          setTagName(value);
          setTagInputError(null);
        }}
        onAddTag={handleAddTag}
        onRenameTag={handleRenameTag}
        onDeleteTag={handleDeleteTag}
      />
    ) : (
      <>
        {shouldShowMainSaveError ? (
          <div className="app-error-alert" role="alert">
            {mainSaveFeedback}
          </div>
        ) : null}
        <NotesToolbar
          copy={copy}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          priority={priority}
          onPriorityChange={setPriority}
          sortMode={sortMode}
          onSortModeChange={setSortMode}
          noteViewMode={noteViewMode}
          trashCount={counts.trash}
          sidebarToggleTitle={sidebarToggleTitle}
          onToggleSidebar={() =>
            setIsSidebarCollapsed((collapsed) => !collapsed)
          }
          onResetFilters={resetFilters}
          onClearTrash={() => setIsClearTrashConfirmOpen(true)}
        />

        <NotesList
          copy={copy}
          language={currentLanguage}
          noteViewMode={noteViewMode}
          visibleNotes={visibleNotes}
          hasData={Boolean(data)}
          isLoading={isLoading}
          hasLoadError={hasLoadError}
          onRetryLoad={() => loadData()}
          onOpenNote={openExistingNote}
          onToggleCompleted={async (note) => {
            await updateNote(toggleNoteCompleted(note));
          }}
          onToggleChecklist={async (note, itemId, checked) => {
            await updateNote(toggleChecklistItem(note, itemId, checked));
          }}
          onTrash={handleMoveToTrash}
          onRestore={handleRestore}
          onDuplicate={handleDuplicateNote}
          onDelete={setDeleteTarget}
        />
      </>
    );

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
      mainContent={mainContent}
      onToggleAlwaysOnTop={async () =>
        setWindowState(await window.ideaNotes.toggleAlwaysOnTop())
      }
      onOpenSettings={openSettings}
      onMinimizeWindow={() => window.ideaNotes.minimizeWindow()}
      onToggleMaximizeWindow={async () =>
        setWindowState(await window.ideaNotes.toggleMaximizeWindow())
      }
      onCloseWindow={() => window.ideaNotes.closeWindow()}
      onOpenNewNote={openNewNote}
      onViewModeChange={setViewMode}
      onToggleSelectedTag={toggleSelectedTag}
      onOpenTagSettings={openTagSettings}
    >
      {viewMode === "settings" ? (
        <>
          <SettingsPanel
            data={data}
            language={currentLanguage}
            isSaving={isSaving}
            saveError={!isResetSettingsConfirmOpen ? mainSaveFeedback : null}
            onSettingsChange={handleSettingsChange}
            onStartupChange={handleStartupChange}
            onResetSettings={() => {
              setSaveFeedback(null);
              setIsResetSettingsConfirmOpen(true);
            }}
            onBack={() => setViewMode("active")}
          />
        </>
      ) : null}

      {mainSaveFeedback && hasConfirmDialog ? (
        <div className="app-error-alert dialog-error-alert" role="alert">
          {mainSaveFeedback}
        </div>
      ) : null}

      {isResetSettingsConfirmOpen && (
        <ConfirmDialog
          title={settingsCopy[currentLanguage].resetConfirm}
          copy={copy}
          onCancel={() => setIsResetSettingsConfirmOpen(false)}
          onConfirm={handleConfirmResetSettings}
          panelClassName="settings-reset-confirm-panel"
          confirmLabel={copy.confirm}
          isBusy={isSaving}
        />
      )}

      {isEditorOpen ? (
        <EditorDialog
          draft={draft}
          tags={data?.tags ?? []}
          copy={copy}
          language={currentLanguage}
          noteTimestamps={editingNote}
          setDraft={setDraft}
          onToggleTag={toggleDraftTag}
          onCancel={() => {
            if (!isSaving) setIsEditorOpen(false);
          }}
          onSave={handleSaveNote}
          saveError={editorSaveFeedback}
          isSaving={isSaving}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          noteTitle={deleteTarget.title}
          copy={copy}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => handlePermanentDelete(deleteTarget.id)}
          isBusy={isSaving}
        />
      ) : null}

      {isClearTrashConfirmOpen && (
        <ConfirmDialog
          title={copy.clearTrashConfirmTitle}
          body={copy.clearTrashConfirmBody}
          copy={copy}
          onCancel={() => setIsClearTrashConfirmOpen(false)}
          onConfirm={handleClearTrash}
          isBusy={isSaving}
        />
      )}
    </AppShell>
  );
}
