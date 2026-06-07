// Idea Notes 笔记卡片更多操作菜单组件。
// 作用：
// 1. 根据笔记状态渲染更多操作菜单项。
// 2. 让 NoteCardHeader 只负责标题和入口按钮，不内联状态菜单分支。
import type { ReactElement } from "react";
import { DotsThreeIcon } from "@phosphor-icons/react";
import type { IdeaNote } from "@shared/types";
import type { AppCopy } from "../../i18n";
import { DropdownButton } from "../ui/dropdown/DropdownButton";
import { DropdownMenu } from "../ui/dropdown/DropdownMenu";

interface NoteCardMenuProps {
  note: IdeaNote;
  copy: AppCopy;
  canEdit: boolean;
  isCompleted: boolean;
  isInTrash: boolean;
  onOpen: (note: IdeaNote) => void;
  onToggleCompleted: () => Promise<void>;
  onArchive: (note: IdeaNote) => Promise<void>;
  onTrash: (note: IdeaNote) => Promise<void>;
  onRestore: (note: IdeaNote) => Promise<void>;
  onRestoreArchived: (note: IdeaNote) => Promise<void>;
  onDuplicate: (note: IdeaNote) => Promise<void>;
  onDelete: (note: IdeaNote) => void;
}

export function NoteCardMenu({
  note,
  copy,
  canEdit,
  isCompleted,
  isInTrash,
  onOpen,
  onToggleCompleted,
  onArchive,
  onTrash,
  onRestore,
  onRestoreArchived,
  onDuplicate,
  onDelete,
}: NoteCardMenuProps): ReactElement {
  return (
    <DropdownButton
      buttonClassName="note-icon-btn"
      icon={<DotsThreeIcon weight="bold" />}
      label={copy.moreActions}
    >
      <DropdownMenu className="note-context-menu" label={copy.moreActions}>
        {canEdit ? (
          <>
            <button type="button" role="menuitem" onClick={() => onOpen(note)}>
              {copy.menuEdit}
            </button>
            <button type="button" role="menuitem" onClick={onToggleCompleted}>
              {copy.menuComplete}
            </button>
            <button type="button" role="menuitem" onClick={() => onArchive(note)}>
              {copy.menuArchive}
            </button>
            <button type="button" role="menuitem" onClick={() => onDuplicate(note)}>
              {copy.menuDuplicate}
            </button>
            <button type="button" role="menuitem" onClick={() => onTrash(note)}>
              {copy.menuMoveTrash}
            </button>
          </>
        ) : null}
        {isCompleted ? (
          <>
            <button type="button" role="menuitem" onClick={onToggleCompleted}>
              {copy.menuRestoreProgress}
            </button>
            <button type="button" role="menuitem" onClick={() => onTrash(note)}>
              {copy.menuMoveTrash}
            </button>
          </>
        ) : null}
        {note.status === "archive" ? (
          <>
            <button
              type="button"
              role="menuitem"
              onClick={() => onRestoreArchived(note)}
            >
              {copy.menuRestoreArchive}
            </button>
            <button type="button" role="menuitem" onClick={() => onTrash(note)}>
              {copy.menuMoveTrash}
            </button>
          </>
        ) : null}
        {isInTrash ? (
          <>
            <button type="button" role="menuitem" onClick={() => onRestore(note)}>
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
  );
}
