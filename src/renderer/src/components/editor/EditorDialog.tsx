// Idea Notes 全表面编辑器组件。
// 作用：
// 1. 渲染新建和编辑笔记共用的标题、正文、优先级、截止时间和标签选择表单。
// 2. 只维护传入草稿的字段变更，不直接保存本地数据。
import type { Dispatch, ReactElement, SetStateAction } from "react";
import type { AppLanguage, NoteDraft } from "@shared/types";
import { DialogShell } from "../dialogs/DialogShell";
import type { AppCopy } from "../../i18n";
import { EditorDialogActions } from "./EditorDialogActions";
import { EditorMainFields } from "./EditorMainFields";
import { EditorSidePanel } from "./EditorSidePanel";

interface EditorDialogProps {
  draft: NoteDraft;
  tags: string[];
  copy: AppCopy;
  language: AppLanguage;
  noteTimestamps?: { createdAt: number; updatedAt: number };
  setDraft: Dispatch<SetStateAction<NoteDraft>>;
  onToggleTag: (tag: string) => void;
  onCancel: () => void;
  onSave: () => Promise<void>;
  saveError?: string | null;
  isSaving?: boolean;
}

export function EditorDialog({
  draft,
  tags,
  copy,
  language,
  noteTimestamps,
  setDraft,
  onToggleTag,
  onCancel,
  onSave,
  saveError,
  isSaving = false,
}: EditorDialogProps): ReactElement {
  const title = draft.id ? copy.editNote : copy.newNoteTitle;
  const actions = (
    <EditorDialogActions
      copy={copy}
      isSaving={isSaving}
      onCancel={onCancel}
      onSave={onSave}
    />
  );

  return (
    <DialogShell
      title={title}
      titleId="editor-title"
      overlayClassName="editor-overlay"
      panelClassName="editor-panel"
      headerClassName="editor-head"
      bodyClassName="editor-body"
      actionsClassName="editor-actions"
      actions={actions}
      onEscape={onCancel}
    >
      {saveError ? (
        <div className="app-error-alert editor-error-alert" role="alert">
          {saveError}
        </div>
      ) : null}
      <EditorMainFields
        draft={draft}
        copy={copy}
        setDraft={setDraft}
        isSaving={isSaving}
      />
      <EditorSidePanel
        draft={draft}
        tags={tags}
        copy={copy}
        language={language}
        noteTimestamps={noteTimestamps}
        setDraft={setDraft}
        onToggleTag={onToggleTag}
        isSaving={isSaving}
      />
    </DialogShell>
  );
}
