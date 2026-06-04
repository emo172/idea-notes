// Idea Notes 笔记截止状态工具。
// 作用：
// 1. 将卡片截止时间状态判断从 JSX 组件中隔离出来。
// 2. 对缺失或非法日期返回空状态，避免错误高亮笔记卡片。
export type DeadlineStatus = "overdue" | "pending";

export function getDeadlineStatus(dueAt?: string): DeadlineStatus | null {
  if (!dueAt) return null;
  const dueTime = Date.parse(dueAt);
  if (Number.isNaN(dueTime)) return null;
  return dueTime < Date.now() ? "overdue" : "pending";
}
