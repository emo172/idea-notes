// App 覆盖层组合组件。
// 作用：
// 1. 集中渲染设置页、保存反馈、编辑器和确认弹窗。
// 2. 让 `IdeaNotesApp` 专注主界面接线和状态来源。
import type { Dispatch, ReactElement, SetStateAction } from "react";
import type {
  AppLanguage,
  IdeaNote,
  IdeaNotesData,
  ImportDataMode,
} from "@shared/types";
import type { UseNoteEditorResult } from "../hooks/useNoteEditor";
import type { AppCopy } from "../i18n";
import { ConfirmOverlays } from "./ConfirmOverlays";
import { EditorOverlay } from "./EditorOverlay";
import { SettingsOverlay } from "./SettingsOverlay";
import type { ViewMode } from "./viewMode";

interface AppOverlaysProps {
  viewMode: ViewMode;
  data: IdeaNotesData | null;
  currentLanguage: AppLanguage;
  copy: AppCopy;
  isSaving: boolean;
  mainSaveFeedback: string | null;
  editorSaveFeedback: string | null;
  backupFeedback: string | null;
  hasConfirmDialog: boolean;
  isResetSettingsConfirmOpen: boolean;
  importConfirmMode: ImportDataMode | null;
  setIsResetSettingsConfirmOpen: Dispatch<SetStateAction<boolean>>;
  setImportConfirmMode: (mode: ImportDataMode | null) => void;
  setSaveFeedback: (feedback: null) => void;
  setViewMode: Dispatch<SetStateAction<ViewMode>>;
  handleSettingsChange: (settings: Partial<IdeaNotesData["settings"]>) => Promise<void>;
  handleStartupChange: (enabled: boolean) => Promise<void>;
  handleExportData: () => Promise<void>;
  handleConfirmImportData: () => Promise<void>;
  handleConfirmResetSettings: () => Promise<void>;
  noteEditor: UseNoteEditorResult;
  deleteTarget: IdeaNote | null;
  setDeleteTarget: Dispatch<SetStateAction<IdeaNote | null>>;
  handlePermanentDelete: (noteId: string) => Promise<void>;
  isClearTrashConfirmOpen: boolean;
  setIsClearTrashConfirmOpen: Dispatch<SetStateAction<boolean>>;
  handleClearTrash: () => Promise<void>;
}

export function AppOverlays({
  viewMode,
  data,
  currentLanguage,
  copy,
  isSaving,
  mainSaveFeedback,
  editorSaveFeedback,
  backupFeedback,
  hasConfirmDialog,
  isResetSettingsConfirmOpen,
  importConfirmMode,
  setIsResetSettingsConfirmOpen,
  setImportConfirmMode,
  setSaveFeedback,
  setViewMode,
  handleSettingsChange,
  handleStartupChange,
  handleExportData,
  handleConfirmImportData,
  handleConfirmResetSettings,
  noteEditor,
  deleteTarget,
  setDeleteTarget,
  handlePermanentDelete,
  isClearTrashConfirmOpen,
  setIsClearTrashConfirmOpen,
  handleClearTrash,
}: AppOverlaysProps): ReactElement {
  return (
    <>
      <SettingsOverlay
        viewMode={viewMode}
        data={data}
        currentLanguage={currentLanguage}
        isSaving={isSaving}
        mainSaveFeedback={mainSaveFeedback}
        backupFeedback={backupFeedback}
        isResetSettingsConfirmOpen={isResetSettingsConfirmOpen}
        setIsResetSettingsConfirmOpen={setIsResetSettingsConfirmOpen}
        setImportConfirmMode={setImportConfirmMode}
        setSaveFeedback={setSaveFeedback}
        setViewMode={setViewMode}
        handleSettingsChange={handleSettingsChange}
        handleStartupChange={handleStartupChange}
        handleExportData={handleExportData}
      />

      <ConfirmOverlays
        currentLanguage={currentLanguage}
        copy={copy}
        isSaving={isSaving}
        mainSaveFeedback={mainSaveFeedback}
        hasConfirmDialog={hasConfirmDialog}
        isResetSettingsConfirmOpen={isResetSettingsConfirmOpen}
        importConfirmMode={importConfirmMode}
        setIsResetSettingsConfirmOpen={setIsResetSettingsConfirmOpen}
        setImportConfirmMode={setImportConfirmMode}
        handleConfirmImportData={handleConfirmImportData}
        handleConfirmResetSettings={handleConfirmResetSettings}
        deleteTarget={deleteTarget}
        setDeleteTarget={setDeleteTarget}
        handlePermanentDelete={handlePermanentDelete}
        isClearTrashConfirmOpen={isClearTrashConfirmOpen}
        setIsClearTrashConfirmOpen={setIsClearTrashConfirmOpen}
        handleClearTrash={handleClearTrash}
      />

      <EditorOverlay
        data={data}
        currentLanguage={currentLanguage}
        copy={copy}
        isSaving={isSaving}
        editorSaveFeedback={editorSaveFeedback}
        noteEditor={noteEditor}
      />
    </>
  );
}
