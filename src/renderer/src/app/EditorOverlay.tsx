// 编辑器覆盖层组件。
// 作用：
// 1. 承载 App 覆盖层中的 EditorDialog 分支。
// 2. 保持编辑器取消、保存和草稿更新仍通过 useNoteEditor 返回值执行。
import type { ReactElement } from "react";
import type { AppLanguage, IdeaNotesData } from "@shared/types";
import { EditorDialog } from "../components/editor/EditorDialog";
import type { UseNoteEditorResult } from "../hooks/useNoteEditor";
import type { AppCopy } from "../i18n";

interface EditorOverlayProps {
  data: IdeaNotesData | null;
  currentLanguage: AppLanguage;
  copy: AppCopy;
  isSaving: boolean;
  editorSaveFeedback: string | null;
  noteEditor: UseNoteEditorResult;
}

export function EditorOverlay({
  data,
  currentLanguage,
  copy,
  isSaving,
  editorSaveFeedback,
  noteEditor,
}: EditorOverlayProps): ReactElement | null {
  if (!noteEditor.isEditorOpen) return null;

  return (
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
  );
}
