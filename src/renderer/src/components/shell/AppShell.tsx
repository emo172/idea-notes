// Idea Notes 应用外壳组件。
// 作用：
// 1. 承载自定义标题栏、窗口控制、侧边栏导航和主内容容器。
// 2. 让 App 专注业务状态编排，避免把通用框架 JSX 与保存/编辑逻辑混在一起。
// 3. 保持原有 className、ARIA 名称和窗口控制回调契约稳定。
import type { ReactElement, ReactNode } from "react";
import type { DesktopWindowState, IdeaTag, NoteStatus } from "@shared/types";
import type { MainViewMode, ViewMode } from "../../app/viewMode";
import type { AppCopy } from "../../i18n";
import { SidebarNav } from "./SidebarNav";
import { SidebarTags } from "./SidebarTags";
import { Titlebar } from "./Titlebar";

interface AppShellProps {
  appClassName: string;
  appBodyClassName: string;
  copy: AppCopy;
  windowState: DesktopWindowState;
  useAppWindowControls: boolean;
  pinButtonLabel: string;
  viewMode: ViewMode;
  counts: Record<NoteStatus, number>;
  tags: IdeaTag[];
  selectedTags: string[];
  mainContent: ReactNode;
  children?: ReactNode;
  onToggleAlwaysOnTop: () => Promise<void>;
  onOpenSettings: () => void;
  onOpenShortcutHelp: () => void;
  onMinimizeWindow: () => void;
  onToggleMaximizeWindow: () => Promise<void>;
  onCloseWindow: () => void;
  onOpenNewNote: () => void;
  onViewModeChange: (viewMode: MainViewMode) => void;
  onToggleSelectedTag: (tag: string) => void;
  onOpenTagSettings: () => void;
}

export function AppShell({
  appClassName,
  appBodyClassName,
  copy,
  windowState,
  useAppWindowControls,
  pinButtonLabel,
  viewMode,
  counts,
  tags,
  selectedTags,
  mainContent,
  children,
  onToggleAlwaysOnTop,
  onOpenSettings,
  onOpenShortcutHelp,
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
      <Titlebar
        copy={copy}
        windowState={windowState}
        useAppWindowControls={useAppWindowControls}
        pinButtonLabel={pinButtonLabel}
        onToggleAlwaysOnTop={onToggleAlwaysOnTop}
        onOpenSettings={onOpenSettings}
        onOpenShortcutHelp={onOpenShortcutHelp}
        onMinimizeWindow={onMinimizeWindow}
        onToggleMaximizeWindow={onToggleMaximizeWindow}
        onCloseWindow={onCloseWindow}
      />

      <div className={appBodyClassName}>
        <aside className="sidebar">
          <SidebarNav
            copy={copy}
            viewMode={viewMode}
            counts={counts}
            onOpenNewNote={onOpenNewNote}
            onViewModeChange={onViewModeChange}
          />
          <SidebarTags
            copy={copy}
            viewMode={viewMode}
            tags={tags}
            selectedTags={selectedTags}
            onToggleSelectedTag={onToggleSelectedTag}
            onOpenTagSettings={onOpenTagSettings}
          />
        </aside>

        <main className="main-content">{mainContent}</main>
      </div>

      {children}
    </div>
  );
}
