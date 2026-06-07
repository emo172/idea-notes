// Idea Notes 应用外壳侧栏主导航组件。
// 作用：
// 1. 渲染新建笔记入口、概览入口和状态视图入口。
// 2. 统一维护侧栏主导航的图标、计数和 aria-current 语义。
import type { ReactElement } from "react";
import {
  ArchiveBoxIcon,
  CheckCircleIcon,
  PlusIcon,
  PresentationChartIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import type { NoteStatus } from "@shared/types";
import type { MainViewMode, ViewMode } from "../../app/viewMode";
import type { AppCopy } from "../../i18n";
import { AppButton } from "../ui/AppButton";

interface SidebarNavProps {
  copy: AppCopy;
  viewMode: ViewMode;
  counts: Record<NoteStatus, number>;
  onOpenNewNote: () => void;
  onViewModeChange: (viewMode: MainViewMode) => void;
}

const statusIcons: Record<NoteStatus, ReactElement> = {
  active: <CheckCircleIcon weight="bold" />,
  completed: <CheckCircleIcon weight="bold" />,
  archive: <ArchiveBoxIcon weight="bold" />,
  trash: <TrashIcon weight="bold" />,
};

export function SidebarNav({
  copy,
  viewMode,
  counts,
  onOpenNewNote,
  onViewModeChange,
}: SidebarNavProps): ReactElement {
  return (
    <>
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
          aria-current={viewMode === "overview" ? "page" : undefined}
          icon={<PresentationChartIcon weight="bold" />}
          onClick={() => onViewModeChange("overview")}
        >
          <span>{copy.overview}</span>
        </AppButton>
        {(["active", "completed", "archive", "trash"] as NoteStatus[]).map((status) => (
          <AppButton
            className="nav-link"
            active={viewMode === status}
            aria-current={viewMode === status ? "page" : undefined}
            icon={statusIcons[status]}
            key={status}
            onClick={() => onViewModeChange(status)}
          >
            <span>{copy.statusLabels[status]}</span>
            <span className="nav-badge">{counts[status]}</span>
          </AppButton>
        ))}
      </nav>
    </>
  );
}
