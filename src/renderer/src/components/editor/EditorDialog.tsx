// Idea Notes 全表面编辑器组件。
// 作用：
// 1. 渲染新建和编辑笔记共用的标题、正文、优先级、截止时间和标签选择表单。
// 2. 只维护传入草稿的字段变更，不直接保存本地数据。
import type { Dispatch, ReactElement, SetStateAction } from "react";
import { FloppyDiskIcon, XCircleIcon } from "@phosphor-icons/react";
import type { AppLanguage, NoteDraft, NotePriority } from "@shared/types";
import { DialogShell } from "../dialogs/DialogShell";
import { AppButton } from "../ui/AppButton";
import type { AppCopy } from "../../i18n";
import { formatDate } from "../../utils/dateFormatting";

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
}: EditorDialogProps): ReactElement {
  // 行号至少保留三行，空白新笔记也能呈现接近真实编辑器的输入基线。
  const lineNumbers = Array.from(
    { length: Math.max(3, draft.body.split("\n").length) },
    (_, index) => index + 1,
  );
  const title = draft.id ? copy.editNote : copy.newNoteTitle;
  const actions = (
    <>
      <AppButton
        className="editor-action-button editor-cancel-action"
        icon={<XCircleIcon className="editor-cancel-icon" weight="bold" />}
        onClick={onCancel}
      >
        {copy.cancel}
      </AppButton>
      <AppButton
        className="editor-action-button editor-save-action"
        variant="primary"
        icon={<FloppyDiskIcon weight="bold" />}
        onClick={onSave}
      >
        {copy.saveNote}
      </AppButton>
    </>
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
    >
      <div className="editor-main">
        <label className="form-field">
          <span>{copy.title}</span>
          <input
            aria-label={copy.title}
            value={draft.title}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                title: event.target.value,
              }))
            }
            placeholder={copy.titlePlaceholder}
          />
        </label>
        <div className="form-field grow">
          <span>{copy.body}</span>
          <div className="editor-textarea-container">
            <div className="line-numbers" aria-hidden="true">
              {lineNumbers.map((lineNumber) => (
                <span key={lineNumber}>{lineNumber}</span>
              ))}
            </div>
            <textarea
              aria-label={copy.body}
              className="editor-textarea"
              value={draft.body}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  body: event.target.value,
                }))
              }
              placeholder={copy.bodyPlaceholder}
            />
          </div>
        </div>
      </div>
      <aside className="editor-side">
        <label className="form-field">
          <span>{copy.priority}</span>
          <select
            className="priority-select"
            value={draft.priority}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                priority: event.target.value as NotePriority,
              }))
            }
          >
            <option className="priority-option-high" value="high">
              {copy.priorityLabels.high}
            </option>
            <option className="priority-option-medium" value="medium">
              {copy.priorityLabels.medium}
            </option>
            <option className="priority-option-low" value="low">
              {copy.priorityLabels.low}
            </option>
          </select>
        </label>
        <label className="form-field">
          <span>{copy.dueAt}</span>
          <input
            type="datetime-local"
            value={draft.dueAt ?? ""}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                dueAt: event.target.value || undefined,
              }))
            }
          />
        </label>
        {noteTimestamps && (
          <>
            <div className="form-field">
              <span>{copy.createdAt}</span>
              <time
                className="timestamp-value"
                dateTime={new Date(noteTimestamps.createdAt).toISOString()}
              >
                {formatDate(noteTimestamps.createdAt, language, copy)}
              </time>
            </div>
            <div className="form-field">
              <span>{copy.updatedAt}</span>
              <time
                className="timestamp-value"
                dateTime={new Date(noteTimestamps.updatedAt).toISOString()}
              >
                {formatDate(noteTimestamps.updatedAt, language, copy)}
              </time>
            </div>
          </>
        )}
        <div className="form-field">
          <span>{copy.tags}</span>
          <div className="tag-picker">
            {tags.map((tag) => (
              <button
                className={
                  draft.tags.includes(tag)
                    ? "tag-option selected"
                    : "tag-option"
                }
                type="button"
                key={tag}
                onClick={() => onToggleTag(tag)}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </DialogShell>
  );
}
