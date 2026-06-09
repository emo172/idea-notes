// 截止提醒通知文案。
// 作用：
// 1. 为主进程提供不依赖 renderer i18n 的最小通知文案表。
// 2. 根据持久化语言设置生成系统通知标题和正文。
import type { AppLanguage, IdeaNote } from "../types";

interface ReminderNotificationCopy {
  fallbackTitle: string;
  dueAtBody: (dueAt: string) => string;
  reminderTimeBody: string;
}

const reminderNotificationCopy: Record<AppLanguage, ReminderNotificationCopy> = {
  "zh-CN": {
    fallbackTitle: "灵感笔记提醒",
    dueAtBody: (dueAt) => `截止时间：${dueAt}`,
    reminderTimeBody: "笔记已到提醒时间",
  },
  "zh-TW": {
    fallbackTitle: "靈感筆記提醒",
    dueAtBody: (dueAt) => `截止時間：${dueAt}`,
    reminderTimeBody: "筆記已到提醒時間",
  },
  en: {
    fallbackTitle: "Idea Notes reminder",
    dueAtBody: (dueAt) => `Due time: ${dueAt}`,
    reminderTimeBody: "The note has reached its reminder time",
  },
};

export function getReminderNotificationCopy(
  language: AppLanguage,
  note: IdeaNote,
): { title: string; body: string } {
  const copy = reminderNotificationCopy[language];
  return {
    title: note.title || copy.fallbackTitle,
    body: note.dueAt ? copy.dueAtBody(note.dueAt) : copy.reminderTimeBody,
  };
}
