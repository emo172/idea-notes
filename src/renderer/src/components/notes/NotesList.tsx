// 笔记列表组件。
// 作用：
// 1. 承载笔记列表的加载失败、加载中、空状态和卡片映射。
// 2. 保持 notes-list 区域 DOM、ARIA 与卡片回调语义稳定。
import { useState } from "react";
import type { ReactElement } from "react";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import type { AppLanguage, IdeaNote, IdeaTag, NoteStatus } from "@shared/types";
import { AppButton } from "../ui/AppButton";
import type { AppCopy } from "../../i18n";
import { NoteCard } from "./NoteCard";

interface NotesListProps {
  copy: AppCopy;
  language: AppLanguage;
  tags: IdeaTag[];
  searchQuery: string;
  noteViewMode: NoteStatus;
  visibleNotes: IdeaNote[];
  hasData: boolean;
  isLoading: boolean;
  hasLoadError: boolean;
  onRetryLoad: () => void;
  onOpenNote: (note: IdeaNote) => void;
  onToggleCompleted: (note: IdeaNote) => Promise<void>;
  onTogglePin: (note: IdeaNote) => Promise<void>;
  onToggleChecklist: (
    note: IdeaNote,
    itemId: string,
    checked: boolean,
  ) => Promise<void>;
  onArchive: (note: IdeaNote) => Promise<void>;
  onTrash: (note: IdeaNote) => Promise<void>;
  onRestore: (note: IdeaNote) => Promise<void>;
  onRestoreArchived: (note: IdeaNote) => Promise<void>;
  onDuplicate: (note: IdeaNote) => Promise<void>;
  onCopyText: (text: string, kind: "title" | "body") => Promise<void>;
  onDropMarkdownFiles: (filePaths: string[]) => Promise<void>;
  onExportNoteMarkdown: (noteId: string) => Promise<void>;
  onDelete: (note: IdeaNote) => void;
  canCopyToClipboard: boolean;
}

export function NotesList({
  copy,
  language,
  tags,
  searchQuery,
  noteViewMode,
  visibleNotes,
  hasData,
  isLoading,
  hasLoadError,
  onRetryLoad,
  onOpenNote,
  onToggleCompleted,
  onTogglePin,
  onToggleChecklist,
  onArchive,
  onTrash,
  onRestore,
  onRestoreArchived,
  onDuplicate,
  onCopyText,
  onDropMarkdownFiles,
  onExportNoteMarkdown,
  onDelete,
  canCopyToClipboard,
}: NotesListProps): ReactElement {
  const [isDraggingMarkdown, setIsDraggingMarkdown] = useState(false);
  const sectionClassName = isDraggingMarkdown
    ? "notes-list notes-list-dragging"
    : "notes-list";

  function extractDroppedFilePaths(files: FileList): string[] {
    return Array.from(files)
      .map((file) => window.ideaNotes.getDroppedFilePath(file))
      .filter(Boolean);
  }

  return (
    <section
      className={sectionClassName}
      aria-label={copy.statusLabels[noteViewMode]}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDraggingMarkdown(true);
      }}
      onDragLeave={() => setIsDraggingMarkdown(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDraggingMarkdown(false);
        void onDropMarkdownFiles(extractDroppedFilePaths(event.dataTransfer.files));
      }}
    >
      {isDraggingMarkdown ? (
        <div className="markdown-drop-indicator">{copy.markdownDropActive}</div>
      ) : null}
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
              tags={tags}
              searchQuery={searchQuery}
              copy={copy}
              language={language}
              onOpen={onOpenNote}
              onToggleCompleted={() => onToggleCompleted(note)}
              onTogglePin={onTogglePin}
              onToggleChecklist={(itemId, checked) =>
                onToggleChecklist(note, itemId, checked)
              }
              onArchive={onArchive}
              onTrash={onTrash}
              onRestore={onRestore}
              onRestoreArchived={onRestoreArchived}
              onDuplicate={onDuplicate}
              onCopyText={onCopyText}
              onExportMarkdown={onExportNoteMarkdown}
              onDelete={onDelete}
              canCopyToClipboard={canCopyToClipboard}
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
