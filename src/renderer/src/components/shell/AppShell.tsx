// Idea Notes 应用外壳组件。
// 作用：
// 1. 承载自定义标题栏、窗口控制、侧边栏导航和主内容容器。
// 2. 让 App 专注业务状态编排，避免把通用框架 JSX 与保存/编辑逻辑混在一起。
// 3. 保持原有 className、ARIA 名称和窗口控制回调契约稳定。
import type { ReactElement, ReactNode } from "react";
import {
  ArchiveBoxIcon,
  CheckCircleIcon,
  PlusIcon,
  PresentationChartIcon,
  TagIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import type { DesktopWindowState, IdeaTag, NoteStatus } from "@shared/types";
import type { MainViewMode, ViewMode } from "../../app/viewMode";
import type { AppCopy } from "../../i18n";
import {
  CloseIcon,
  MaximizeIcon,
  MinimizeIcon,
  PinIcon,
  RestoreIcon,
  SettingsIcon,
} from "../titlebar/TitlebarIcons";
import { AppButton } from "../ui/AppButton";
import { getTagStyle } from "../../utils/tagDisplay";

interface AppShellProps {
  appClassName: string;
  appBodyClassName: string;
  copy: AppCopy;
  windowState: DesktopWindowState;
  pinButtonLabel: string;
  viewMode: ViewMode;
  counts: Record<NoteStatus, number>;
  tags: IdeaTag[];
  selectedTags: string[];
  mainContent: ReactNode;
  children?: ReactNode;
  onToggleAlwaysOnTop: () => Promise<void>;
  onOpenSettings: () => void;
  onMinimizeWindow: () => void;
  onToggleMaximizeWindow: () => Promise<void>;
  onCloseWindow: () => void;
  onOpenNewNote: () => void;
  onViewModeChange: (viewMode: MainViewMode) => void;
  onToggleSelectedTag: (tag: string) => void;
  onOpenTagSettings: () => void;
}

const statusIcons: Record<NoteStatus, ReactElement> = {
  active: <CheckCircleIcon weight="bold" />,
  completed: <CheckCircleIcon weight="bold" />,
  archive: <ArchiveBoxIcon weight="bold" />,
  trash: <TrashIcon weight="bold" />,
};

export function AppShell({
  appClassName,
  appBodyClassName,
  copy,
  windowState,
  pinButtonLabel,
  viewMode,
  counts,
  tags,
  selectedTags,
  mainContent,
  children,
  onToggleAlwaysOnTop,
  onOpenSettings,
  onMinimizeWindow,
  onToggleMaximizeWindow,
  onCloseWindow,
  onOpenNewNote,
  onViewModeChange,
  onToggleSelectedTag,
  onOpenTagSettings,
}: AppShellProps): ReactElement {
  return (
    <div className={appClassName}>
      <header className="titlebar">
        <div className="titlebar-left">
          <span className="app-logo">I</span>
          <span className="app-title">{copy.appTitle}</span>
        </div>
        <div className="titlebar-actions">
          <AppButton
            className={windowState.isAlwaysOnTop ? "icon-btn active" : "icon-btn"}
            active={windowState.isAlwaysOnTop}
            variant="icon"
            aria-label={pinButtonLabel}
            title={pinButtonLabel}
            icon={<PinIcon pinned={windowState.isAlwaysOnTop} />}
            onClick={onToggleAlwaysOnTop}
          />
          <AppButton
            className="icon-btn titlebar-icon-btn"
            variant="icon"
            aria-label={copy.settings}
            title={copy.settings}
            icon={<SettingsIcon />}
            onClick={onOpenSettings}
          />
          <div className="window-controls">
            <AppButton
              variant="icon"
              aria-label={copy.minimize}
              icon={<MinimizeIcon />}
              onClick={onMinimizeWindow}
            />
            <AppButton
              variant="icon"
              aria-label={windowState.isMaximized ? copy.restoreWindow : copy.maximize}
              icon={windowState.isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
              onClick={onToggleMaximizeWindow}
            />
            <AppButton
              className="close"
              variant="icon"
              aria-label={copy.close}
              icon={<CloseIcon />}
              onClick={onCloseWindow}
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
              onClick={onOpenNewNote}
            >
              {copy.newNote}
            </AppButton>
          </div>
          <nav className="nav-menu" aria-label={copy.notesNav}>
            <AppButton
              className="nav-link"
              active={viewMode === "overview"}
              icon={<PresentationChartIcon weight="bold" />}
              onClick={() => onViewModeChange("overview")}
            >
              <span>{copy.overview}</span>
            </AppButton>
            {(["active", "completed", "archive", "trash"] as NoteStatus[]).map(
              (status) => (
                <AppButton
                  className="nav-link"
                  active={viewMode === status}
                  icon={statusIcons[status]}
                  key={status}
                  onClick={() => onViewModeChange(status)}
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
              {tags.map((tag) => (
                <button
                  className={
                    selectedTags.includes(tag.name)
                      ? "tag-option selected"
                      : "tag-option"
                  }
                  style={getTagStyle(tags, tag.name)}
                  type="button"
                  key={tag.id}
                  onClick={() => onToggleSelectedTag(tag.name)}
                >
                  #{tag.name}
                </button>
              ))}
            </div>
            <AppButton
              className="tag-settings-link"
              active={viewMode === "tag-settings"}
              icon={<TagIcon weight="bold" />}
              onClick={onOpenTagSettings}
            >
              {copy.tagSettingsNav}
            </AppButton>
          </section>
        </aside>

        <main className="main-content">{mainContent}</main>
      </div>

      {children}
    </div>
  );
}
