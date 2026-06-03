// Idea Notes React 主界面。
// 作用：
// 1. 渲染自定义标题栏、侧边栏、筛选工具栏，并组合笔记卡片、编辑器和设置面板。
// 2. 通过 window.ideaNotes 从 Electron 主进程加载和保存本地数据。
// 3. 调用 shared 纯函数处理筛选排序、标签同步和回收站状态。
// 4. 将渲染层状态编排与拆分后的组件、工具函数、多语言文案连接起来。
import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import {
  ArrowCounterClockwiseIcon,
  CheckCircleIcon,
  PlusIcon,
  TagIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { defaultSettings } from "@shared/defaultData";
import {
  deleteTag,
  duplicateNote,
  filterAndSortNotes,
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
  NotePriority,
  NoteStatus,
  SortMode,
} from "@shared/types";
import { ConfirmDialog } from "../components/dialogs/ConfirmDialog";
import { EditorDialog } from "../components/editor/EditorDialog";
import { NoteCard } from "../components/notes/NoteCard";
import { SettingsPanel } from "../components/settings/SettingsPanel";
import { TagSettingsPanel } from "../components/settings/TagSettingsPanel";
import {
  CloseIcon,
  MaximizeIcon,
  MinimizeIcon,
  PinIcon,
  RestoreIcon,
  SettingsIcon,
  SidebarToggleIcon,
} from "../components/titlebar/TitlebarIcons";
import { AppButton } from "../components/ui/AppButton";
import { appCopy, settingsCopy } from "../i18n";
import {
  buildDraftFromNote,
  draftToUpdatedNote,
  initialDraft,
} from "../utils/noteDraft";

type ViewMode = NoteStatus | "settings" | "tag-settings";
const darkModeQuery = "(prefers-color-scheme: dark)";

const statusIcons: Record<NoteStatus, ReactElement> = {
  active: <CheckCircleIcon weight="bold" />,
  completed: <CheckCircleIcon weight="bold" />,
  trash: <TrashIcon weight="bold" />,
};

function getSystemPrefersDark(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia(darkModeQuery).matches
  );
}

export default function App(): ReactElement {
  const [data, setData] = useState<IdeaNotesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    getSystemPrefersDark,
  );
  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [priority, setPriority] = useState<NotePriority | "all">("all");
  const [sortMode, setSortMode] = useState<SortMode>("important");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
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

  async function loadData(shouldCommit = () => true): Promise<void> {
    setIsLoading(true);
    setHasLoadError(false);
    try {
      const loadedData = await window.ideaNotes.getData();
      if (!shouldCommit()) return;
      setData(loadedData);
    } catch {
      if (!shouldCommit()) return;
      setData(null);
      setHasLoadError(true);
    } finally {
      if (shouldCommit()) setIsLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    void loadData(() => mounted);
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia(darkModeQuery);
    const handleChange = (event: MediaQueryListEvent): void => {
      setSystemPrefersDark(event.matches);
    };
    setSystemPrefersDark(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // 设置页和标签设置页会覆盖主内容区，但底层笔记列表仍保持进行中筛选状态。
  const noteViewMode: NoteStatus =
    viewMode === "settings" || viewMode === "tag-settings"
      ? "active"
      : viewMode;

  const visibleNotes = data
    ? filterAndSortNotes(data.notes, {
        status: noteViewMode,
        searchQuery,
        priority,
        selectedTags,
        sortMode,
      })
    : [];

  async function persist(nextData: IdeaNotesData): Promise<void> {
    // 持久化以主进程返回值为准，确保 renderer 状态与磁盘写入后的数据一致。
    const saved = await window.ideaNotes.saveData(nextData);
    setData(saved);
  }

  function openNewNote(): void {
    setDraft(initialDraft);
    setIsEditorOpen(true);
  }

  function openExistingNote(note: IdeaNote): void {
    setDraft(buildDraftFromNote(note));
    setIsEditorOpen(true);
  }

  function openSettings(): void {
    setIsEditorOpen(false);
    setViewMode("settings");
  }

  function openTagSettings(): void {
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
    await persist(nextData);
    setIsEditorOpen(false);
    setDraft(initialDraft);
    setViewMode("active");
  }

  async function updateNote(note: IdeaNote): Promise<void> {
    if (!data) return;
    await persist({
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
    await persist({ ...data, notes: [copiedNote, ...data.notes] });
    setViewMode(copiedNote.status);
  }

  async function handlePermanentDelete(noteId: string): Promise<void> {
    if (!data) return;
    await persist({
      ...data,
      notes: permanentlyDeleteNote(data.notes, noteId),
    });
    setDeleteTarget(null);
  }

  async function handleClearTrash(): Promise<void> {
    if (!data) return;
    await persist({
      ...data,
      notes: permanentlyDeleteAllTrash(data.notes),
    });
    setIsClearTrashConfirmOpen(false);
  }

  async function handleAddTag(): Promise<void> {
    if (!data) return;
    const nextTag = tagName.trim();
    if (!nextTag || data.tags.includes(nextTag)) return;
    await persist({ ...data, tags: [...data.tags, nextTag] });
    setTagName("");
  }

  async function handleRenameTag(from: string, to: string): Promise<void> {
    if (!data) return;
    const nextTag = to.trim();
    if (!nextTag || nextTag === from || data.tags.includes(nextTag)) return;
    await persist(renameTag(data, from, nextTag));
    setSelectedTags((tags) =>
      tags.map((item) => (item === from ? nextTag : item)),
    );
  }

  async function handleDeleteTag(tag: string): Promise<void> {
    if (!data) return;
    await persist(deleteTag(data, tag));
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
    const startup = await window.ideaNotes.setStartup(defaultSettings.startup);
    await persist(updateSettings(data, { ...defaultSettings, startup }));
    setIsResetSettingsConfirmOpen(false);
  }

  async function handleStartupChange(enabled: boolean): Promise<void> {
    const startup = await window.ideaNotes.setStartup(enabled);
    await handleSettingsChange({ startup });
  }

  function toggleSelectedTag(tag: string): void {
    setSelectedTags((tags) =>
      tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag],
    );
  }

  function resetFilters(): void {
    setSearchQuery("");
    setPriority("all");
    setSortMode("important");
    setSelectedTags([]);
  }

  function toggleDraftTag(tag: string): void {
    setDraft((currentDraft) => ({
      ...currentDraft,
      tags: currentDraft.tags.includes(tag)
        ? currentDraft.tags.filter((item) => item !== tag)
        : [...currentDraft.tags, tag],
    }));
  }

  const notes = data?.notes ?? [];
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
  const backgroundColor = data?.settings.backgroundColor;
  const appStyle = isDarkTheme ? undefined : { backgroundColor };
  const appBodyClassName = isSidebarCollapsed
    ? "app-body sidebar-collapsed"
    : "app-body";
  const pinButtonLabel = windowState.isAlwaysOnTop
    ? copy.cancelAlwaysOnTop
    : copy.alwaysOnTop;
  const sidebarToggleTitle = isSidebarCollapsed ? copy.expand : copy.collapse;

  return (
    <div className={appClassName} style={appStyle}>
      <header className="titlebar">
        <div className="titlebar-left">
          <span className="app-logo">I</span>
          <span className="app-title">{copy.appTitle}</span>
        </div>
        <div className="titlebar-actions">
          <AppButton
            className={
              windowState.isAlwaysOnTop ? "icon-btn active" : "icon-btn"
            }
            active={windowState.isAlwaysOnTop}
            variant="icon"
            aria-label={pinButtonLabel}
            title={pinButtonLabel}
            icon={<PinIcon pinned={windowState.isAlwaysOnTop} />}
            onClick={async () =>
              setWindowState(await window.ideaNotes.toggleAlwaysOnTop())
            }
          />
          <AppButton
            className="icon-btn titlebar-icon-btn"
            variant="icon"
            aria-label={copy.settings}
            title={copy.settings}
            icon={<SettingsIcon />}
            onClick={openSettings}
          />
          <div className="window-controls">
            <AppButton
              variant="icon"
              aria-label={copy.minimize}
              icon={<MinimizeIcon />}
              onClick={() => window.ideaNotes.minimizeWindow()}
            />
            <AppButton
              variant="icon"
              aria-label={
                windowState.isMaximized ? copy.restoreWindow : copy.maximize
              }
              icon={
                windowState.isMaximized ? <RestoreIcon /> : <MaximizeIcon />
              }
              onClick={async () =>
                setWindowState(await window.ideaNotes.toggleMaximizeWindow())
              }
            />
            <AppButton
              className="close"
              variant="icon"
              aria-label={copy.close}
              icon={<CloseIcon />}
              onClick={() => window.ideaNotes.closeWindow()}
            />
          </div>
        </div>
      </header>

      <div className={appBodyClassName}>
        <aside className="sidebar">
          <div className="sidebar-header">
            <AppButton
              variant="primary"
              icon={<PlusIcon weight="bold" />}
              onClick={openNewNote}
            >
              {copy.newNote}
            </AppButton>
          </div>
          <nav className="nav-menu" aria-label={copy.notesNav}>
            {(["active", "completed", "trash"] as NoteStatus[]).map(
              (status) => (
                <AppButton
                  className="nav-link"
                  active={viewMode === status}
                  icon={statusIcons[status]}
                  key={status}
                  onClick={() => setViewMode(status)}
                >
                  <span>{copy.statusLabels[status]}</span>
                  <span className="nav-badge">{counts[status]}</span>
                </AppButton>
              ),
            )}
          </nav>
          <section className="tags-section">
            <div className="section-title">{copy.tagFilter}</div>
            <div className="tag-stack">
              {data?.tags.map((tag) => (
                <button
                  className={
                    selectedTags.includes(tag)
                      ? "tag-option selected"
                      : "tag-option"
                  }
                  type="button"
                  key={tag}
                  onClick={() => toggleSelectedTag(tag)}
                >
                  #{tag}
                </button>
              ))}
            </div>
            <AppButton
              className="tag-settings-link"
              active={viewMode === "tag-settings"}
              icon={<TagIcon weight="bold" />}
              onClick={openTagSettings}
            >
              {copy.tagSettingsNav}
            </AppButton>
          </section>
        </aside>

        <main className="main-content">
          {viewMode === "tag-settings" ? (
            <TagSettingsPanel
              data={data}
              copy={copy}
              tagName={tagName}
              setTagName={setTagName}
              onAddTag={handleAddTag}
              onRenameTag={handleRenameTag}
              onDeleteTag={handleDeleteTag}
            />
          ) : (
            <>
              <section className="toolbar" aria-label={copy.toolbar}>
                <AppButton
                  className="icon-btn sidebar-toggle"
                  variant="icon"
                  aria-label={copy.sidebarToggle}
                  title={sidebarToggleTitle}
                  icon={<SidebarToggleIcon />}
                  onClick={() =>
                    setIsSidebarCollapsed((collapsed) => !collapsed)
                  }
                />
                <label className="search-field">
                  <span>{copy.search}</span>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={copy.searchPlaceholder}
                  />
                </label>
                <label className="toolbar-select-group">
                  <span>{copy.priority}</span>
                  <select
                    className="priority-select"
                    value={priority}
                    onChange={(event) =>
                      setPriority(event.target.value as NotePriority | "all")
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
                    onChange={(event) =>
                      setSortMode(event.target.value as SortMode)
                    }
                  >
                    <option value="important">{copy.sortImportant}</option>
                    <option value="newest">{copy.sortNewest}</option>
                    <option value="progress">{copy.sortProgress}</option>
                  </select>
                </label>
                <AppButton
                  className="btn-subtle"
                  icon={<ArrowCounterClockwiseIcon weight="bold" />}
                  onClick={resetFilters}
                >
                  {copy.resetFilters}
                </AppButton>
                {noteViewMode === "trash" && counts.trash > 0 && (
                  <AppButton
                    className="danger"
                    icon={<TrashIcon weight="bold" />}
                    onClick={() => setIsClearTrashConfirmOpen(true)}
                  >
                    {copy.clearTrash}
                  </AppButton>
                )}
              </section>

              <section
                className="notes-list"
                aria-label={copy.statusLabels[noteViewMode]}
              >
                {hasLoadError ? (
                  <div className="empty-state">
                    <strong>{copy.loadErrorTitle}</strong>
                    <p>{copy.loadErrorBody}</p>
                    <AppButton
                      className="btn-subtle"
                      icon={<ArrowCounterClockwiseIcon weight="bold" />}
                      onClick={() => loadData()}
                    >
                      {copy.retryLoad}
                    </AppButton>
                  </div>
                ) : data ? (
                  visibleNotes.length > 0 ? (
                    visibleNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        copy={copy}
                        language={currentLanguage}
                        onOpen={openExistingNote}
                        onToggleCompleted={async () =>
                          updateNote(toggleNoteCompleted(note))
                        }
                        onToggleChecklist={async (itemId, checked) =>
                          updateNote(toggleChecklistItem(note, itemId, checked))
                        }
                        onTrash={handleMoveToTrash}
                        onRestore={handleRestore}
                        onDuplicate={handleDuplicateNote}
                        onDelete={setDeleteTarget}
                      />
                    ))
                  ) : (
                    <div className="empty-state">{copy.emptyNotes}</div>
                  )
                ) : isLoading ? (
                  <div className="empty-state">{copy.loadingNotes}</div>
                ) : (
                  <div className="empty-state">{copy.emptyNotes}</div>
                )}
              </section>
            </>
          )}
        </main>
      </div>

      {viewMode === "settings" ? (
        <SettingsPanel
          data={data}
          language={currentLanguage}
          onSettingsChange={handleSettingsChange}
          onStartupChange={handleStartupChange}
          onResetSettings={() => setIsResetSettingsConfirmOpen(true)}
          onBack={() => setViewMode("active")}
        />
      ) : null}

      {isResetSettingsConfirmOpen && (
        <ConfirmDialog
          title={settingsCopy[currentLanguage].resetConfirm}
          copy={copy}
          onCancel={() => setIsResetSettingsConfirmOpen(false)}
          onConfirm={handleConfirmResetSettings}
          panelClassName="settings-reset-confirm-panel"
          confirmLabel={copy.confirm}
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
          onCancel={() => setIsEditorOpen(false)}
          onSave={handleSaveNote}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          noteTitle={deleteTarget.title}
          copy={copy}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => handlePermanentDelete(deleteTarget.id)}
        />
      ) : null}

      {isClearTrashConfirmOpen && (
        <ConfirmDialog
          title={copy.clearTrashConfirmTitle}
          body={copy.clearTrashConfirmBody}
          copy={copy}
          onCancel={() => setIsClearTrashConfirmOpen(false)}
          onConfirm={handleClearTrash}
        />
      )}
    </div>
  );
}
