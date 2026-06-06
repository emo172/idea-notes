// App 展示状态派生工具。
// 作用：
// 1. 集中计算外壳 class、侧栏计数和保存反馈文案。
// 2. 让主 App 组件只负责状态来源与组件接线。
import type {
  DesktopWindowState,
  IdeaNote,
  IdeaNotesData,
  ImportDataMode,
  NoteStatus,
} from "@shared/types";
import type { SaveFeedback } from "../hooks/useIdeaNotesData";
import type { AppCopy } from "../i18n";
import { countNotesByStatus } from "../utils/noteCounts";
import type { ViewMode } from "./viewMode";

interface AppPresentationInput {
  data: IdeaNotesData | null;
  systemPrefersDark: boolean;
  isSidebarCollapsed: boolean;
  windowState: DesktopWindowState;
  copy: AppCopy;
  saveFeedback: SaveFeedback | null;
  viewMode: ViewMode;
  deleteTarget: IdeaNote | null;
  isClearTrashConfirmOpen: boolean;
  isResetSettingsConfirmOpen: boolean;
  importConfirmMode: ImportDataMode | null;
}

export interface AppPresentationState {
  counts: Record<NoteStatus, number>;
  appClassName: string;
  appBodyClassName: string;
  pinButtonLabel: string;
  sidebarToggleTitle: string;
  mainSaveFeedback: string | null;
  editorSaveFeedback: string | null;
  hasConfirmDialog: boolean;
  shouldShowMainSaveError: boolean;
}

export function getAppPresentationState({
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
}: AppPresentationInput): AppPresentationState {
  const isDarkTheme =
    data?.settings.themeMode === "dark" ||
    (data?.settings.themeMode === "system" && systemPrefersDark);
  const saveFeedbackMessage =
    saveFeedback?.kind === "failed"
      ? copy.saveFailed
      : saveFeedback?.kind === "busy"
        ? copy.saveBusy
        : null;
  const hasConfirmDialog =
    Boolean(deleteTarget) ||
    isClearTrashConfirmOpen ||
    isResetSettingsConfirmOpen ||
    Boolean(importConfirmMode);
  const mainSaveFeedback = saveFeedback?.target === "main" ? saveFeedbackMessage : null;

  return {
    counts: countNotesByStatus(data?.notes ?? []),
    appClassName: isDarkTheme ? "app-window dark" : "app-window",
    appBodyClassName: isSidebarCollapsed ? "app-body sidebar-collapsed" : "app-body",
    pinButtonLabel: windowState.isAlwaysOnTop
      ? copy.cancelAlwaysOnTop
      : copy.alwaysOnTop,
    sidebarToggleTitle: isSidebarCollapsed ? copy.expand : copy.collapse,
    mainSaveFeedback,
    editorSaveFeedback: saveFeedback?.target === "editor" ? saveFeedbackMessage : null,
    hasConfirmDialog,
    shouldShowMainSaveError:
      Boolean(mainSaveFeedback) && viewMode !== "settings" && !hasConfirmDialog,
  };
}
