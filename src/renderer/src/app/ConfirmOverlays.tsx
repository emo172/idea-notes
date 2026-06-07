// 确认弹窗覆盖层组件。
// 作用：
// 1. 承载导入、重置设置、彻底删除和清空回收站确认弹窗。
// 2. 保持确认弹窗保存反馈、忙碌态、取消和确认回调语义不变。
import type { Dispatch, ReactElement, SetStateAction } from "react";
import type { AppLanguage, IdeaNote, ImportDataMode } from "@shared/types";
import { ConfirmDialog } from "../components/dialogs/ConfirmDialog";
import { SaveFeedbackAlert } from "../components/feedback/SaveFeedbackAlert";
import type { AppCopy } from "../i18n";
import { settingsCopy } from "../i18n";

interface ConfirmOverlaysProps {
  currentLanguage: AppLanguage;
  copy: AppCopy;
  isSaving: boolean;
  mainSaveFeedback: string | null;
  hasConfirmDialog: boolean;
  isResetSettingsConfirmOpen: boolean;
  importConfirmMode: ImportDataMode | null;
  setIsResetSettingsConfirmOpen: Dispatch<SetStateAction<boolean>>;
  setImportConfirmMode: (mode: ImportDataMode | null) => void;
  handleConfirmImportData: () => Promise<void>;
  handleConfirmResetSettings: () => Promise<void>;
  deleteTarget: IdeaNote | null;
  setDeleteTarget: Dispatch<SetStateAction<IdeaNote | null>>;
  handlePermanentDelete: (noteId: string) => Promise<void>;
  isClearTrashConfirmOpen: boolean;
  setIsClearTrashConfirmOpen: Dispatch<SetStateAction<boolean>>;
  handleClearTrash: () => Promise<void>;
}

export function ConfirmOverlays({
  currentLanguage,
  copy,
  isSaving,
  mainSaveFeedback,
  hasConfirmDialog,
  isResetSettingsConfirmOpen,
  importConfirmMode,
  setIsResetSettingsConfirmOpen,
  setImportConfirmMode,
  handleConfirmImportData,
  handleConfirmResetSettings,
  deleteTarget,
  setDeleteTarget,
  handlePermanentDelete,
  isClearTrashConfirmOpen,
  setIsClearTrashConfirmOpen,
  handleClearTrash,
}: ConfirmOverlaysProps): ReactElement {
  return (
    <>
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
