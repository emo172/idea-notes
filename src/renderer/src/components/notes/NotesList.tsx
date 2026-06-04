// 笔记列表组件。
// 作用：
// 1. 承载笔记列表的加载失败、加载中、空状态和卡片映射。
// 2. 保持 notes-list 区域 DOM、ARIA 与卡片回调语义稳定。
import type { ReactElement } from "react";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import type { AppLanguage, IdeaNote, NoteStatus } from "@shared/types";
import { AppButton } from "../ui/AppButton";
import type { AppCopy } from "../../i18n";
import { NoteCard } from "./NoteCard";

interface NotesListProps {
  copy: AppCopy;
  language: AppLanguage;
  noteViewMode: NoteStatus;
  visibleNotes: IdeaNote[];
  hasData: boolean;
  isLoading: boolean;
  hasLoadError: boolean;
  onRetryLoad: () => void;
  onOpenNote: (note: IdeaNote) => void;
  onToggleCompleted: (note: IdeaNote) => Promise<void>;
  onToggleChecklist: (
    note: IdeaNote,
    itemId: string,
    checked: boolean,
  ) => Promise<void>;
  onTrash: (note: IdeaNote) => Promise<void>;
  onRestore: (note: IdeaNote) => Promise<void>;
  onDuplicate: (note: IdeaNote) => Promise<void>;
  onDelete: (note: IdeaNote) => void;
}

export function NotesList({
  copy,
  language,
  noteViewMode,
  visibleNotes,
  hasData,
  isLoading,
  hasLoadError,
  onRetryLoad,
  onOpenNote,
  onToggleCompleted,
  onToggleChecklist,
  onTrash,
  onRestore,
  onDuplicate,
  onDelete,
}: NotesListProps): ReactElement {
  return (
    <section className="notes-list" aria-label={copy.statusLabels[noteViewMode]}>
      {hasLoadError ? (
        <div className="empty-state">
          <strong>{copy.loadErrorTitle}</strong>
          <p>{copy.loadErrorBody}</p>
          <AppButton
            className="btn-subtle"
            icon={<ArrowCounterClockwiseIcon weight="bold" />}
            onClick={onRetryLoad}
          >
            {copy.retryLoad}
          </AppButton>
        </div>
      ) : hasData ? (
        visibleNotes.length > 0 ? (
          visibleNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              copy={copy}
              language={language}
              onOpen={onOpenNote}
              onToggleCompleted={() => onToggleCompleted(note)}
              onToggleChecklist={(itemId, checked) =>
                onToggleChecklist(note, itemId, checked)
              }
              onTrash={onTrash}
              onRestore={onRestore}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
            />
          ))
        ) : (
          <div className="empty-state">{copy.emptyNotes}</div>
        )
      ) : isLoading ? (
        <div className="empty-state">{copy.loadingNotes}</div>
      ) : (
        <div className="empty-state">{copy.emptyNotes}</div>
      )}
    </section>
  );
}
