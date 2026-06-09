// Idea Notes 笔记卡片组合组件。
// 作用：
// 1. 组合标题、元信息、内容预览、标签和底部动作，保持单条笔记卡片的 DOM 契约。
// 2. 将卡片动作通过回调交给 App 统一处理，组件本身不接触持久化 API。
import type { ReactElement } from "react";
import { getCompletion } from "@shared/noteLogic";
import type { AppLanguage, IdeaNote, IdeaTag } from "@shared/types";
import type { AppCopy } from "../../i18n";
import { getTagStyle } from "../../utils/tagDisplay";
import { NoteCardActions } from "./NoteCardActions";
import { NoteCardHeader } from "./NoteCardHeader";
import { NoteCardMeta } from "./NoteCardMeta";
import { NoteContentPreview } from "./NoteContentPreview";
import { getDeadlineStatus } from "./noteDeadline";

interface NoteCardProps {
  note: IdeaNote;
  tags: IdeaTag[];
  copy: AppCopy;
  language: AppLanguage;
  searchQuery: string;
  onOpen: (note: IdeaNote) => void;
  onToggleCompleted: () => Promise<void>;
  onTogglePin: (note: IdeaNote) => Promise<void>;
  onToggleChecklist: (itemId: string, checked: boolean) => Promise<void>;
  onArchive: (note: IdeaNote) => Promise<void>;
  onTrash: (note: IdeaNote) => Promise<void>;
  onRestore: (note: IdeaNote) => Promise<void>;
  onRestoreArchived: (note: IdeaNote) => Promise<void>;
  onDuplicate: (note: IdeaNote) => Promise<void>;
  onDelete: (note: IdeaNote) => void;
}

export function NoteCard({
  note,
  tags,
  copy,
  language,
  searchQuery,
  onOpen,
  onToggleCompleted,
  onTogglePin,
  onToggleChecklist,
  onArchive,
  onTrash,
  onRestore,
  onRestoreArchived,
  onDuplicate,
  onDelete,
}: NoteCardProps): ReactElement {
  const completion = getCompletion(note);
  const deadlineStatus = getDeadlineStatus(note.dueAt);
  const deadlineClassName = deadlineStatus ? `deadline-${deadlineStatus}` : "";
  const cardClassName = `note-card priority-${note.priority} ${deadlineClassName} ${note.status === "completed" ? "completed" : ""} ${
    note.status === "trash" ? "in-trash" : ""
  }`;
  const isCompleted = note.status === "completed";
  const isArchived = note.status === "archive";
  const isInTrash = note.status === "trash";
  const canEdit = !isCompleted && !isArchived && !isInTrash;

  return (
    <article className={cardClassName}>
      <NoteCardHeader
        note={note}
        copy={copy}
        canEdit={canEdit}
        isCompleted={isCompleted}
        isInTrash={isInTrash}
        searchQuery={searchQuery}
        onOpen={onOpen}
        onToggleCompleted={onToggleCompleted}
        onTogglePin={onTogglePin}
        onArchive={onArchive}
        onTrash={onTrash}
        onRestore={onRestore}
        onRestoreArchived={onRestoreArchived}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
      <NoteCardMeta
        note={note}
        copy={copy}
        language={language}
        isInTrash={isInTrash}
        deadlineStatus={deadlineStatus}
      />
      <NoteContentPreview
        note={note}
        copy={copy}
        canEdit={canEdit}
        completion={completion}
        searchQuery={searchQuery}
        onToggleChecklist={onToggleChecklist}
      />
      <footer className="note-footer">
        <div className="tags">
          {note.tags.map((tag) => (
            <span className="tag" style={getTagStyle(tags, tag)} key={tag}>
              #{tag}
            </span>
          ))}
        </div>
        <NoteCardActions
          note={note}
          copy={copy}
          onToggleCompleted={onToggleCompleted}
          onArchive={onArchive}
          onTrash={onTrash}
          onRestore={onRestore}
          onRestoreArchived={onRestoreArchived}
          onDelete={onDelete}
        />
      </footer>
    </article>
  );
}
