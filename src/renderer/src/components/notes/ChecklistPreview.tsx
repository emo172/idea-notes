// Idea Notes 笔记卡片清单预览组件。
// 作用：
// 1. 渲染卡片内前 4 条清单、完成摘要和分段进度条。
// 2. 在不可编辑状态下保持清单项只读，避免绕过卡片状态限制。
import type { ReactElement } from "react";
import type { CompletionSummary, IdeaNote } from "@shared/types";
import type { AppCopy } from "../../i18n";

interface ChecklistPreviewProps {
  note: IdeaNote;
  copy: AppCopy;
  canEdit: boolean;
  completion: CompletionSummary;
  onToggleChecklist: (itemId: string, checked: boolean) => Promise<void>;
}

export function ChecklistPreview({
  note,
  copy,
  canEdit,
  completion,
  onToggleChecklist,
}: ChecklistPreviewProps): ReactElement {
  return (
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
              onChange={(event) => onToggleChecklist(item.id, event.target.checked)}
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
        {note.checklist.map((item) => (
          <span
            aria-hidden="true"
            className={`progress-bar-segment ${item.checked ? "completed" : "pending"}`}
            key={item.id}
          />
        ))}
      </div>
    </>
  );
}
