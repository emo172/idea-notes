// Idea Notes 笔记卡片标题区组件。
// 作用：
// 1. 渲染卡片标题、编辑按钮和更多操作菜单。
// 2. 按笔记状态控制菜单项，不改变 App 传入回调的触发语义。
import type { ReactElement } from "react";
import { PencilSimpleIcon, PushPinIcon } from "@phosphor-icons/react";
import { parseSearchQuery } from "@shared/noteLogic";
import type { IdeaNote } from "@shared/types";
import type { AppCopy } from "../../i18n";
import { highlightText } from "../../utils/highlightText";
import { AppButton } from "../ui/AppButton";
import { NoteCardMenu } from "./NoteCardMenu";

interface NoteCardHeaderProps {
  note: IdeaNote;
  copy: AppCopy;
  canEdit: boolean;
  isCompleted: boolean;
  isInTrash: boolean;
  searchQuery: string;
  onOpen: (note: IdeaNote) => void;
  onToggleCompleted: () => Promise<void>;
  onTogglePin: (note: IdeaNote) => Promise<void>;
  onArchive: (note: IdeaNote) => Promise<void>;
  onTrash: (note: IdeaNote) => Promise<void>;
  onRestore: (note: IdeaNote) => Promise<void>;
  onRestoreArchived: (note: IdeaNote) => Promise<void>;
  onDuplicate: (note: IdeaNote) => Promise<void>;
  onCopyText: (text: string, kind: "title" | "body") => Promise<void>;
  onDelete: (note: IdeaNote) => void;
  canCopyToClipboard: boolean;
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
  onTogglePin,
  onArchive,
  onTrash,
  onRestore,
  onRestoreArchived,
  onDuplicate,
  onCopyText,
  onDelete,
  canCopyToClipboard,
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
        {note.pinned ? (
          <span className="note-pin-indicator" role="img" aria-label={copy.pinNote}>
            <PushPinIcon aria-hidden="true" weight="fill" />
          </span>
        ) : null}
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
        <NoteCardMenu
          note={note}
          copy={copy}
          canEdit={canEdit}
          isCompleted={isCompleted}
          isInTrash={isInTrash}
          onOpen={onOpen}
          onToggleCompleted={onToggleCompleted}
          onTogglePin={onTogglePin}
          onArchive={onArchive}
          onTrash={onTrash}
          onRestore={onRestore}
          onRestoreArchived={onRestoreArchived}
          onDuplicate={onDuplicate}
          onCopyText={onCopyText}
          onDelete={onDelete}
          canCopyToClipboard={canCopyToClipboard}
        />
      </div>
    </div>
  );
}
