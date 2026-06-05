// Idea Notes 笔记卡片元信息组件。
// 作用：
// 1. 渲染状态、截止时间、截止状态和优先级标签。
// 2. 保持卡片 meta 区的图标、className 和本地化日期格式一致。
import type { ReactElement } from "react";
import { CalendarIcon, CheckCircleIcon, TrashIcon } from "@phosphor-icons/react";
import type { AppLanguage, IdeaNote } from "@shared/types";
import type { AppCopy } from "../../i18n";
import { formatDate } from "../../utils/dateFormatting";
import type { DeadlineStatus } from "./noteDeadline";

interface NoteCardMetaProps {
  note: IdeaNote;
  copy: AppCopy;
  language: AppLanguage;
  isInTrash: boolean;
  deadlineStatus: DeadlineStatus | null;
}

export function NoteCardMeta({
  note,
  copy,
  language,
  isInTrash,
  deadlineStatus,
}: NoteCardMetaProps): ReactElement {
  return (
    <div className="note-meta">
      <span className="note-meta-item">
        {isInTrash ? (
          <TrashIcon aria-hidden="true" weight="bold" />
        ) : (
          <CheckCircleIcon aria-hidden="true" weight="bold" />
        )}
        {copy.statusPrefix}：{copy.statusLabels[note.status]}
      </span>
      <span className="note-meta-item">
        <CalendarIcon aria-hidden="true" weight="bold" />
        {copy.dueAt}：{formatDate(note.dueAt, language, copy)}
      </span>
      {deadlineStatus ? (
        <span className={`deadline-status ${deadlineStatus}`}>
          {deadlineStatus === "overdue" ? copy.deadlineOverdue : copy.deadlinePending}
        </span>
      ) : null}
      <span className={`priority-label ${note.priority}`}>
        {copy.priority}：{copy.priorityLabels[note.priority]}
      </span>
    </div>
  );
}
