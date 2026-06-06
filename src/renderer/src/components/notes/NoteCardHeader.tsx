// Idea Notes 笔记卡片标题区组件。
// 作用：
// 1. 渲染卡片标题、编辑按钮和更多操作菜单。
// 2. 按笔记状态控制菜单项，不改变 App 传入回调的触发语义。
import type { ReactElement } from "react";
import { DotsThreeIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import { parseSearchQuery } from "@shared/noteLogic";
import type { IdeaNote } from "@shared/types";
import type { AppCopy } from "../../i18n";
import { highlightText } from "../../utils/highlightText";
import { AppButton } from "../ui/AppButton";
import { DropdownButton } from "../ui/dropdown/DropdownButton";
import { DropdownMenu } from "../ui/dropdown/DropdownMenu";

interface NoteCardHeaderProps {
  note: IdeaNote;
  copy: AppCopy;
  canEdit: boolean;
  isCompleted: boolean;
  isInTrash: boolean;
  searchQuery: string;
  onOpen: (note: IdeaNote) => void;
  onToggleCompleted: () => Promise<void>;
  onArchive: (note: IdeaNote) => Promise<void>;
  onTrash: (note: IdeaNote) => Promise<void>;
  onRestore: (note: IdeaNote) => Promise<void>;
  onRestoreArchived: (note: IdeaNote) => Promise<void>;
  onDuplicate: (note: IdeaNote) => Promise<void>;
  onDelete: (note: IdeaNote) => void;
}

export function NoteCardHeader({
  note,
  copy,
  canEdit,
  isCompleted,
  isInTrash,
  searchQuery,
  onOpen,
  onToggleCompleted,
  onArchive,
  onTrash,
  onRestore,
  onRestoreArchived,
  onDuplicate,
  onDelete,
}: NoteCardHeaderProps): ReactElement {
  const searchText = parseSearchQuery(searchQuery).text;

  return (
    <div className="note-header">
      {canEdit ? (
        <button className="note-title" type="button" onClick={() => onOpen(note)}>
          {highlightText(note.title, searchText)}
        </button>
      ) : (
        <h3 className="note-title">{highlightText(note.title, searchText)}</h3>
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
      </div>
    </div>
  );
}
