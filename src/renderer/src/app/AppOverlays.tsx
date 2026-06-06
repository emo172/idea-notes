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
import { ConfirmDialog } from "../components/dialogs/ConfirmDialog";
import { EditorDialog } from "../components/editor/EditorDialog";
import { SaveFeedbackAlert } from "../components/feedback/SaveFeedbackAlert";
import { SettingsPanel } from "../components/settings/SettingsPanel";
import type { UseNoteEditorResult } from "../hooks/useNoteEditor";
import type { AppCopy } from "../i18n";
import { settingsCopy } from "../i18n";
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
      {viewMode === "settings" ? (
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
      ) : null}

      <SaveFeedbackAlert
        message={hasConfirmDialog ? mainSaveFeedback : null}
        className="dialog-error-alert"
      />

      {importConfirmMode ? (
        <ConfirmDialog
          title={
            importConfirmMode === "overwrite"
              ? settingsCopy[currentLanguage].importOverwriteConfirm
              : settingsCopy[currentLanguage].importMergeConfirm
          }
          body={
            importConfirmMode === "overwrite"
              ? settingsCopy[currentLanguage].importOverwriteConfirmBody
              : settingsCopy[currentLanguage].importMergeConfirmBody
          }
          copy={copy}
          onCancel={() => setImportConfirmMode(null)}
          onConfirm={handleConfirmImportData}
          panelClassName="settings-import-confirm-panel"
          confirmLabel={copy.confirm}
          isBusy={isSaving}
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
          isBusy={isSaving}
        />
      )}

      {noteEditor.isEditorOpen ? (
        <EditorDialog
          draft={noteEditor.draft}
          tags={data?.tags ?? []}
          copy={copy}
          language={currentLanguage}
          noteTimestamps={noteEditor.editingNote}
          setDraft={noteEditor.setDraft}
          onToggleTag={noteEditor.toggleDraftTag}
          onCancel={() => {
            if (!isSaving) noteEditor.setIsEditorOpen(false);
          }}
          onSave={noteEditor.handleSaveNote}
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
    </>
  );
}
