// Idea Notes 笔记卡片组件。
// 作用：
// 1. 渲染单条笔记的标题、状态、截止时间、正文预览、清单进度和标签。
// 2. 将卡片动作通过回调交给 App 统一处理，组件本身不接触持久化 API。
import type { ReactElement } from "react";
import {
  ArrowCounterClockwiseIcon,
  CalendarIcon,
  CheckCircleIcon,
  DotsThreeIcon,
  PencilSimpleIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { getCompletion } from "@shared/noteLogic";
import type { AppLanguage, IdeaNote } from "@shared/types";
import { AppButton } from "../ui/AppButton";
import { DropdownButton } from "../ui/dropdown/DropdownButton";
import { DropdownMenu } from "../ui/dropdown/DropdownMenu";
import type { AppCopy } from "../../i18n";
import { formatDate } from "../../utils/dateFormatting";

interface NoteCardProps {
  note: IdeaNote;
  copy: AppCopy;
  language: AppLanguage;
  onOpen: (note: IdeaNote) => void;
  onToggleCompleted: () => Promise<void>;
  onToggleChecklist: (itemId: string, checked: boolean) => Promise<void>;
  onTrash: (note: IdeaNote) => Promise<void>;
  onRestore: (note: IdeaNote) => Promise<void>;
  onDuplicate: (note: IdeaNote) => Promise<void>;
  onDelete: (note: IdeaNote) => void;
}

export function NoteCard({
  note,
  copy,
  language,
  onOpen,
  onToggleCompleted,
  onToggleChecklist,
  onTrash,
  onRestore,
  onDuplicate,
  onDelete,
}: NoteCardProps): ReactElement {
  const completion = getCompletion(note);
  const cardClassName = `note-card priority-${note.priority} ${note.status === "completed" ? "completed" : ""} ${
    note.status === "trash" ? "in-trash" : ""
  }`;
  const isCompleted = note.status === "completed";
  const isInTrash = note.status === "trash";
  const canEdit = !isCompleted && !isInTrash;
  const hasChecklist = note.checklist.length > 0;

  return (
    <article className={cardClassName}>
      <div className="note-header">
        {canEdit ? (
          <button
            className="note-title"
            type="button"
            onClick={() => onOpen(note)}
          >
            {note.title}
          </button>
        ) : (
          <h3 className="note-title">{note.title}</h3>
        )}
        <div className="note-header-actions">
          {canEdit ? (
            <AppButton
              className="note-icon-btn"
              variant="icon"
              aria-label={copy.editNote}
              title={copy.editNote}
              icon={<PencilSimpleIcon weight="bold" />}
              onClick={() => onOpen(note)}
            />
          ) : null}
          <DropdownButton
            buttonClassName="note-icon-btn"
            icon={<DotsThreeIcon weight="bold" />}
            label={copy.moreActions}
          >
            <DropdownMenu
              className="note-context-menu"
              label={copy.moreActions}
            >
              {canEdit ? (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => onOpen(note)}
                  >
                    {copy.menuEdit}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={onToggleCompleted}
                  >
                    {copy.menuComplete}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => onDuplicate(note)}
                  >
                    {copy.menuDuplicate}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => onTrash(note)}
                  >
                    {copy.menuMoveTrash}
                  </button>
                </>
              ) : null}
              {isCompleted ? (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={onToggleCompleted}
                  >
                    {copy.menuRestoreProgress}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => onTrash(note)}
                  >
                    {copy.menuMoveTrash}
                  </button>
                </>
              ) : null}
              {isInTrash ? (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => onRestore(note)}
                  >
                    {copy.menuRestoreTrash}
                  </button>
                  <button
                    className="danger"
                    type="button"
                    role="menuitem"
                    onClick={() => onDelete(note)}
                  >
                    {copy.permanentDelete}
                  </button>
                </>
              ) : null}
            </DropdownMenu>
          </DropdownButton>
        </div>
      </div>
      <div className="note-meta">
        <span className="note-meta-item">
          {isInTrash ? (
            <TrashIcon aria-hidden="true" weight="bold" />
          ) : (
            <CheckCircleIcon aria-hidden="true" weight="bold" />
          )}
          {copy.statusPrefix}：{copy.statusLabels[note.status]}
        </span>
        <span className="note-meta-item">
          <CalendarIcon aria-hidden="true" weight="bold" />
          {copy.dueAt}：
          {formatDate(note.dueAt || note.updatedAt, language, copy)}
        </span>
        <span className={`priority-label ${note.priority}`}>
          {copy.priority}：{copy.priorityLabels[note.priority]}
        </span>
      </div>
      <div className="note-content-preview">
        {hasChecklist ? (
          <>
            <div className="checklist-preview">
              {/* 卡片只预览前 4 条清单，完整内容留给编辑器承载。 */}
              {note.checklist.slice(0, 4).map((item) => (
                <label
                  className={item.checked ? "check-item checked" : "check-item"}
                  key={item.id}
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    // 已完成和回收站笔记没有编辑入口，清单项也保持只读。
                    disabled={!canEdit}
                    onChange={(event) =>
                      onToggleChecklist(item.id, event.target.checked)
                    }
                  />
                  <span>{item.text}</span>
                </label>
              ))}
            </div>
            <div className="completion-summary">
              {copy.completionLabel}：{completion.completed}/{completion.total}
            </div>
            <div
              className="progress-bar-container"
              aria-label={`${copy.completionLabel} ${completion.completed}/${completion.total}`}
            >
              <span
                className="progress-bar-fill"
                style={{ width: `${completion.ratio * 100}%` }}
              />
            </div>
          </>
        ) : (
          <p className="note-body-preview">{note.body}</p>
        )}
      </div>
      <footer className="note-footer">
        <div className="tags">
          {note.tags.map((tag) => (
            <span className="tag" key={tag}>
              #{tag}
            </span>
          ))}
        </div>
        <div className="card-actions">
          {note.status === "trash" ? (
            <>
              <AppButton
                icon={<ArrowCounterClockwiseIcon weight="bold" />}
                onClick={() => onRestore(note)}
              >
                {copy.restore}
              </AppButton>
              <AppButton
                className="danger"
                icon={<TrashIcon weight="bold" />}
                onClick={() => onDelete(note)}
              >
                {copy.permanentDelete}
              </AppButton>
            </>
          ) : (
            <>
              <AppButton
                className="note-complete-action"
                icon={<CheckCircleIcon weight="bold" />}
                onClick={onToggleCompleted}
              >
                {note.status === "completed" ? copy.resume : copy.markComplete}
              </AppButton>
              <AppButton
                className="note-delete-action"
                icon={<TrashIcon weight="bold" />}
                onClick={() => onTrash(note)}
              >
                {copy.delete}
              </AppButton>
            </>
          )}
        </div>
      </footer>
    </article>
  );
}
