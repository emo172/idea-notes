// Idea Notes 日期格式化工具。
// 作用：
// 1. 统一处理笔记卡片上的本地化日期显示。
// 2. 让日期缺失或无效时使用当前语言的空日期文案。
import type { AppLanguage } from "@shared/types";
import type { AppCopy } from "../i18n";

export function formatDate(
  value: number | string | undefined,
  language: AppLanguage,
  copy: AppCopy,
): string {
  if (!value) return copy.noDueDate;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return copy.noDueDate;
  return new Intl.DateTimeFormat(language, {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
