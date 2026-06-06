// App 覆盖层组合组件。
// 作用：
// 1. 集中渲染设置页、保存反馈、编辑器和确认弹窗。
// 2. 让 `IdeaNotesApp` 专注主界面接线和状态来源。
import type { Dispatch, ReactElement, SetStateAction } from "react";
import type {
  AppLanguage,
  IdeaNote,
  IdeaNotesData,
  NoteDraft,
  NoteStatus,
} from "@shared/types";
import { ConfirmDialog } from "../components/dialogs/ConfirmDialog";
import { EditorDialog } from "../components/editor/EditorDialog";
import { SaveFeedbackAlert } from "../components/feedback/SaveFeedbackAlert";
import { SettingsPanel } from "../components/settings/SettingsPanel";
import type { AppCopy } from "../i18n";
import { settingsCopy } from "../i18n";

type ViewMode = NoteStatus | "settings" | "tag-settings";

interface AppOverlaysProps {
  viewMode: ViewMode;
  data: IdeaNotesData | null;
  currentLanguage: AppLanguage;
  copy: AppCopy;
  isSaving: boolean;
  mainSaveFeedback: string | null;
  editorSaveFeedback: string | null;
  hasConfirmDialog: boolean;
  isResetSettingsConfirmOpen: boolean;
  setIsResetSettingsConfirmOpen: Dispatch<SetStateAction<boolean>>;
  setSaveFeedback: (feedback: null) => void;
  setViewMode: Dispatch<SetStateAction<ViewMode>>;
  handleSettingsChange: (settings: Partial<IdeaNotesData["settings"]>) => Promise<void>;
  handleStartupChange: (enabled: boolean) => Promise<void>;
  handleConfirmResetSettings: () => Promise<void>;
  draft: NoteDraft;
  setDraft: Dispatch<SetStateAction<NoteDraft>>;
  isEditorOpen: boolean;
  setIsEditorOpen: Dispatch<SetStateAction<boolean>>;
  editingNote?: IdeaNote;
  toggleDraftTag: (tag: string) => void;
  handleSaveNote: () => Promise<void>;
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
  hasConfirmDialog,
  isResetSettingsConfirmOpen,
  setIsResetSettingsConfirmOpen,
  setSaveFeedback,
  setViewMode,
  handleSettingsChange,
  handleStartupChange,
  handleConfirmResetSettings,
  draft,
  setDraft,
  isEditorOpen,
  setIsEditorOpen,
  editingNote,
  toggleDraftTag,
  handleSaveNote,
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
          onSettingsChange={handleSettingsChange}
          onStartupChange={handleStartupChange}
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
    </>
  );
}
