// Idea Notes 笔记卡片组合组件。
// 作用：
// 1. 组合标题、元信息、内容预览、标签和底部动作，保持单条笔记卡片的 DOM 契约。
// 2. 将卡片动作通过回调交给 App 统一处理，组件本身不接触持久化 API。
import type { ReactElement } from "react";
import { getCompletion } from "@shared/noteLogic";
import type { AppLanguage, IdeaNote } from "@shared/types";
import type { AppCopy } from "../../i18n";
import { NoteCardActions } from "./NoteCardActions";
import { NoteCardHeader } from "./NoteCardHeader";
import { NoteCardMeta } from "./NoteCardMeta";
import { NoteContentPreview } from "./NoteContentPreview";
import { getDeadlineStatus } from "./noteDeadline";

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
  const deadlineStatus = getDeadlineStatus(note.dueAt);
  const deadlineClassName = deadlineStatus ? `deadline-${deadlineStatus}` : "";
  const cardClassName = `note-card priority-${note.priority} ${deadlineClassName} ${note.status === "completed" ? "completed" : ""} ${
    note.status === "trash" ? "in-trash" : ""
  }`;
  const isCompleted = note.status === "completed";
  const isInTrash = note.status === "trash";
  const canEdit = !isCompleted && !isInTrash;

  return (
    <article className={cardClassName}>
      <NoteCardHeader
        note={note}
        copy={copy}
        canEdit={canEdit}
        isCompleted={isCompleted}
        isInTrash={isInTrash}
        onOpen={onOpen}
        onToggleCompleted={onToggleCompleted}
        onTrash={onTrash}
        onRestore={onRestore}
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
        onToggleChecklist={onToggleChecklist}
      />
      <footer className="note-footer">
        <div className="tags">
          {note.tags.map((tag) => (
            <span className="tag" key={tag}>
              #{tag}
            </span>
          ))}
        </div>
        <NoteCardActions
          note={note}
          copy={copy}
          onToggleCompleted={onToggleCompleted}
          onTrash={onTrash}
          onRestore={onRestore}
          onDelete={onDelete}
        />
      </footer>
    </article>
  );
}
