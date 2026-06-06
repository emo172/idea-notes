// 编辑器侧栏组件。
// 作用：
// 1. 渲染优先级、截止时间、时间戳和标签选择。
// 2. 隔离编辑器元信息字段，保持 EditorDialog 只负责组合弹窗。
import type { Dispatch, ReactElement, SetStateAction } from "react";
import type { AppLanguage, IdeaTag, NoteDraft, NotePriority } from "@shared/types";
import type { AppCopy } from "../../i18n";
import { formatDate } from "../../utils/dateFormatting";
import { getTagStyle } from "../../utils/tagDisplay";

interface EditorSidePanelProps {
  draft: NoteDraft;
  tags: IdeaTag[];
  copy: AppCopy;
  language: AppLanguage;
  noteTimestamps?: { createdAt: number; updatedAt: number };
  setDraft: Dispatch<SetStateAction<NoteDraft>>;
  onToggleTag: (tag: string) => void;
  isSaving: boolean;
}

export function EditorSidePanel({
  draft,
  tags,
  copy,
  language,
  noteTimestamps,
  setDraft,
  onToggleTag,
  isSaving,
}: EditorSidePanelProps): ReactElement {
  return (
    <aside className="editor-side">
      <label className="form-field">
        <span>{copy.priority}</span>
        <select
          className="priority-select"
          disabled={isSaving}
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
          disabled={isSaving}
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
                draft.tags.includes(tag.name) ? "tag-option selected" : "tag-option"
              }
              style={getTagStyle(tags, tag.name)}
              type="button"
              disabled={isSaving}
              key={tag.id}
              onClick={() => onToggleTag(tag.name)}
            >
              #{tag.name}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
