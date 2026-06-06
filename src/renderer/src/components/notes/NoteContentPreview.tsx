// Idea Notes 笔记卡片内容预览组件。
// 作用：
// 1. 在清单预览和正文预览之间二选一，避免卡片重复展示同一内容。
// 2. 保持内容区外层 className 稳定，供样式和渲染层测试复用。
import type { ReactElement } from "react";
import { parseSearchQuery } from "@shared/noteLogic";
import type { CompletionSummary, IdeaNote } from "@shared/types";
import type { AppCopy } from "../../i18n";
import { highlightText } from "../../utils/highlightText";
import { ChecklistPreview } from "./ChecklistPreview";

interface NoteContentPreviewProps {
  note: IdeaNote;
  copy: AppCopy;
  canEdit: boolean;
  completion: CompletionSummary;
  searchQuery: string;
  onToggleChecklist: (itemId: string, checked: boolean) => Promise<void>;
}

export function NoteContentPreview({
  note,
  copy,
  canEdit,
  completion,
  searchQuery,
  onToggleChecklist,
}: NoteContentPreviewProps): ReactElement {
  const hasChecklist = note.checklist.length > 0;
  const searchText = parseSearchQuery(searchQuery).text;

  return (
    <div className="note-content-preview">
      {hasChecklist ? (
        <ChecklistPreview
          note={note}
          copy={copy}
          canEdit={canEdit}
          completion={completion}
          onToggleChecklist={onToggleChecklist}
        />
      ) : (
        <p className="note-body-preview">{highlightText(note.body, searchText)}</p>
      )}
    </div>
  );
}
