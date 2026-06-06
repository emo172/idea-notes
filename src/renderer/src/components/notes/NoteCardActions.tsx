// Idea Notes 笔记卡片底部动作组件。
// 作用：
// 1. 渲染卡片底部完成、删除、恢复和永久删除按钮。
// 2. 按笔记状态选择动作组合，保持按钮文案和回调语义稳定。
import type { ReactElement } from "react";
import {
  ArrowCounterClockwiseIcon,
  ArchiveBoxIcon,
  CheckCircleIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import type { IdeaNote } from "@shared/types";
import type { AppCopy } from "../../i18n";
import { AppButton } from "../ui/AppButton";

interface NoteCardActionsProps {
  note: IdeaNote;
  copy: AppCopy;
  onToggleCompleted: () => Promise<void>;
  onArchive: (note: IdeaNote) => Promise<void>;
  onTrash: (note: IdeaNote) => Promise<void>;
  onRestore: (note: IdeaNote) => Promise<void>;
  onRestoreArchived: (note: IdeaNote) => Promise<void>;
  onDelete: (note: IdeaNote) => void;
}

export function NoteCardActions({
  note,
  copy,
  onToggleCompleted,
  onArchive,
  onTrash,
  onRestore,
  onRestoreArchived,
  onDelete,
}: NoteCardActionsProps): ReactElement {
  return (
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
      ) : note.status === "archive" ? (
        <>
          <AppButton
            icon={<ArrowCounterClockwiseIcon weight="bold" />}
            onClick={() => onRestoreArchived(note)}
          >
            {copy.restore}
          </AppButton>
          <AppButton
            className="note-delete-action"
            icon={<TrashIcon weight="bold" />}
            onClick={() => onTrash(note)}
          >
            {copy.delete}
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
            icon={<ArchiveBoxIcon weight="bold" />}
            onClick={() => onArchive(note)}
          >
            {copy.archive}
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
  );
}
