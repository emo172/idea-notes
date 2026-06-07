// 数据概览视图组件。
// 作用：
// 1. 承载 App 主内容中的 overview 分支。
// 2. 保持统计项点击回调继续由 AppMainContent 透传。
import type { ReactElement } from "react";
import type { IdeaNotesData, NotePriority, NoteStatus } from "@shared/types";
import { StatsPanel } from "../components/overview/StatsPanel";
import type { AppCopy } from "../i18n";

interface OverviewViewProps {
  data: IdeaNotesData | null;
  copy: AppCopy;
  onStatsStatusClick: (status: NoteStatus) => void;
  onStatsPriorityClick: (priority: NotePriority) => void;
  onStatsTagClick: (tag: string) => void;
}

export function OverviewView({
  data,
  copy,
  onStatsStatusClick,
  onStatsPriorityClick,
  onStatsTagClick,
}: OverviewViewProps): ReactElement {
  return (
    <StatsPanel
      notes={data?.notes ?? []}
      copy={copy}
      onStatusClick={onStatsStatusClick}
      onPriorityClick={onStatsPriorityClick}
      onTagClick={onStatsTagClick}
    />
  );
}
