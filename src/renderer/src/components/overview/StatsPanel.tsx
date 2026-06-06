// 数据概览面板组件。
// 作用：
// 1. 展示笔记状态、优先级、标签和逾期统计。
// 2. 将统计项点击转换为 App 层已有筛选命令。
import type { ReactElement } from "react";
import { calculateNoteStats } from "@shared/noteLogic";
import type { IdeaNote, NotePriority, NoteStatus } from "@shared/types";
import type { AppCopy } from "../../i18n";

interface StatsPanelProps {
  notes: IdeaNote[];
  copy: AppCopy;
  onStatusClick: (status: NoteStatus) => void;
  onPriorityClick: (priority: NotePriority) => void;
  onTagClick: (tag: string) => void;
}

export function StatsPanel({
  notes,
  copy,
  onStatusClick,
  onPriorityClick,
  onTagClick,
}: StatsPanelProps): ReactElement {
  const stats = calculateNoteStats(notes);
  const completionPercent = `${Math.round(stats.completionRate * 100)}%`;

  return (
    <section className="stats-panel" aria-label={copy.overviewRegion}>
      <div className="stats-summary">
        <div className="stats-summary-item">
          <span>{copy.statsTotal}</span>
          <strong>{stats.total}</strong>
        </div>
        <div className="stats-summary-item">
          <span>{copy.statsCompletionRate}</span>
          <strong>{completionPercent}</strong>
        </div>
        <div className="stats-summary-item">
          <span>{copy.statsOverdue}</span>
          <strong>{stats.overdue}</strong>
        </div>
        <div className="stats-summary-item">
          <span>{copy.statsHighPriority}</span>
          <strong>{stats.highPriority}</strong>
        </div>
      </div>

      <div className="stats-groups">
        <section className="stats-group">
          <h3>{copy.statsStatus}</h3>
          {(["active", "completed", "archive"] as NoteStatus[]).map((status) => (
            <button
              className="stats-row"
              type="button"
              key={status}
              aria-label={`${copy.statusLabels[status]} ${stats.statusCounts[status]}`}
              onClick={() => onStatusClick(status)}
            >
              <span>{copy.statusLabels[status]}</span>
              <strong>{stats.statusCounts[status]}</strong>
            </button>
          ))}
        </section>

        <section className="stats-group">
          <h3>{copy.statsPriority}</h3>
          {(["high", "medium", "low"] as NotePriority[]).map((priority) => (
            <button
              className="stats-row"
              type="button"
              key={priority}
              aria-label={`${copy.priorityLabels[priority]} ${stats.priorityCounts[priority]}`}
              onClick={() => onPriorityClick(priority)}
            >
              <span>{copy.priorityLabels[priority]}</span>
              <strong>{stats.priorityCounts[priority]}</strong>
            </button>
          ))}
        </section>

        <section className="stats-group">
          <h3>{copy.statsTopTags}</h3>
          {stats.topTags.length > 0 ? (
            stats.topTags.map((tag) => (
              <button
                className="stats-row"
                type="button"
                key={tag.tag}
                aria-label={`#${tag.tag} ${tag.count}`}
                onClick={() => onTagClick(tag.tag)}
              >
                <span>#{tag.tag}</span>
                <strong>{tag.count}</strong>
              </button>
            ))
          ) : (
            <div className="stats-empty">{copy.statsNoTags}</div>
          )}
        </section>
      </div>
    </section>
  );
}
