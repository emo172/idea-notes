// 设置覆盖层组件。
// 作用：
// 1. 承载 App 覆盖层中的 settings 分支。
// 2. 保持重置设置前清理保存反馈、返回 active 视图等回调语义不变。
import type { Dispatch, ReactElement, SetStateAction } from "react";
import type { AppLanguage, IdeaNotesData, ImportDataMode } from "@shared/types";
import { SettingsPanel } from "../components/settings/SettingsPanel";
import type { ViewMode } from "./viewMode";

interface SettingsOverlayProps {
  viewMode: ViewMode;
  data: IdeaNotesData | null;
  currentLanguage: AppLanguage;
  isSaving: boolean;
  mainSaveFeedback: string | null;
  backupFeedback: string | null;
  isResetSettingsConfirmOpen: boolean;
  setIsResetSettingsConfirmOpen: Dispatch<SetStateAction<boolean>>;
  setImportConfirmMode: (mode: ImportDataMode | null) => void;
  setSaveFeedback: (feedback: null) => void;
  setViewMode: Dispatch<SetStateAction<ViewMode>>;
  handleSettingsChange: (settings: Partial<IdeaNotesData["settings"]>) => Promise<void>;
  handleStartupChange: (enabled: boolean) => Promise<void>;
  handleExportData: () => Promise<void>;
}

export function SettingsOverlay({
  viewMode,
  data,
  currentLanguage,
  isSaving,
  mainSaveFeedback,
  backupFeedback,
  isResetSettingsConfirmOpen,
  setIsResetSettingsConfirmOpen,
  setImportConfirmMode,
  setSaveFeedback,
  setViewMode,
  handleSettingsChange,
  handleStartupChange,
  handleExportData,
}: SettingsOverlayProps): ReactElement | null {
  if (viewMode !== "settings") return null;

  return (
    <SettingsPanel
      data={data}
      language={currentLanguage}
      isSaving={isSaving}
      saveError={!isResetSettingsConfirmOpen ? mainSaveFeedback : null}
      backupFeedback={backupFeedback}
      onSettingsChange={handleSettingsChange}
      onStartupChange={handleStartupChange}
      onExportData={handleExportData}
      onRequestImportData={setImportConfirmMode}
      onResetSettings={() => {
        setSaveFeedback(null);
        setIsResetSettingsConfirmOpen(true);
      }}
      onBack={() => setViewMode("active")}
    />
  );
}
