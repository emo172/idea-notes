// 主进程截止提醒调度器。
// 作用：
// 1. 定时读取本地数据，计算到期提醒并发送桌面通知。
// 2. 写回已提醒 key，确保同一笔记同一截止时间和提前量只提醒一次。
import { Notification } from "electron";
import { findDueReminders, markReminderNotified } from "@shared/noteLogic";
import { readData, saveData } from "../store";

const reminderIntervalMs = 60_000;
let reminderTimer: NodeJS.Timeout | null = null;

export async function checkRemindersOnce(now = Date.now()): Promise<void> {
  const data = await readData();
  const reminders = findDueReminders(data, now);
  if (reminders.length === 0) return;

  let nextData = data;
  for (const reminder of reminders) {
    try {
      new Notification({
        title: reminder.note.title || "灵感笔记提醒",
        body: reminder.note.dueAt
          ? `截止时间：${reminder.note.dueAt}`
          : "笔记已到提醒时间",
      }).show();
    } catch {
      // 系统通知显示失败时仍记录本轮提醒，避免后续调度重复触发。
    }
    nextData = markReminderNotified(nextData, reminder.key);
  }
  await saveData(nextData);
}

export function startReminderScheduler(): void {
  if (reminderTimer) return;
  reminderTimer = setInterval(() => {
    void checkRemindersOnce().catch(() => {
      // 提醒失败不应中断主进程；下一轮调度会再次尝试读取和提醒。
    });
  }, reminderIntervalMs);
  void checkRemindersOnce().catch(() => {
    // 启动时立即检查一次，读取失败交给后续周期重试。
  });
}

export function stopReminderScheduler(): void {
  if (!reminderTimer) return;
  clearInterval(reminderTimer);
  reminderTimer = null;
}
