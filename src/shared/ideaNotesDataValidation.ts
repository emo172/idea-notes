// IdeaNotesData 运行时结构校验模块。
// 作用：
// 1. 为主进程 IPC 保存入口提供运行时 payload 校验。
// 2. 锁定持久化根对象、笔记、清单和设置的必需字段。
// 3. 允许对象携带额外字段，兼容旧本地数据中的残留字段。
import { normalizeTagColor } from "./tags/tagColor";
import type { IdeaNote, IdeaNotesData } from "./types";

const notePriorities = new Set(["high", "medium", "low"]);
const noteStatuses = new Set(["active", "completed", "archive", "trash"]);
const themeModes = new Set(["light", "dark", "system"]);
const trashRetentions = new Set(["never", "7", "30", "90"]);
const appLanguages = new Set(["zh-CN", "zh-TW", "en"]);
const reminderLeadMinutes = new Set([0, 10, 60, 1440]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDenseArrayOf<T>(
  value: unknown,
  isItem: (item: unknown) => boolean,
): value is T[] {
  if (!Array.isArray(value)) return false;
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index) || !isItem(value[index])) return false;
  }
  return true;
}

function isStringArray(value: unknown): value is string[] {
  return isDenseArrayOf(value, (item) => typeof item === "string");
}

function isIdeaTag(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.color === "string" &&
    normalizeTagColor(value.color) !== null
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isOptionalBoolean(value: unknown): value is boolean | undefined {
  return value === undefined || typeof value === "boolean";
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isOptionalFiniteNumber(value: unknown): value is number | undefined {
  return value === undefined || isFiniteNumber(value);
}

function isChecklistItem(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.text === "string" &&
    typeof value.checked === "boolean"
  );
}

function isOptionalStringArray(value: unknown): value is string[] | undefined {
  return value === undefined || isStringArray(value);
}

function isWindowBounds(value: unknown): boolean {
  return (
    isRecord(value) &&
    (value.x === undefined || isFiniteNumber(value.x)) &&
    (value.y === undefined || isFiniteNumber(value.y)) &&
    isFiniteNumber(value.width) &&
    isFiniteNumber(value.height) &&
    isBoolean(value.isMaximized)
  );
}

function isOptionalPreviousStatus(value: unknown): value is IdeaNote["previousStatus"] {
  return (
    value === undefined ||
    value === "active" ||
    value === "completed" ||
    value === "archive"
  );
}

function isIdeaNote(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.body === "string" &&
    typeof value.priority === "string" &&
    notePriorities.has(value.priority) &&
    isStringArray(value.tags) &&
    typeof value.status === "string" &&
    noteStatuses.has(value.status) &&
    isDenseArrayOf(value.checklist, isChecklistItem) &&
    isOptionalString(value.dueAt) &&
    isFiniteNumber(value.createdAt) &&
    isFiniteNumber(value.updatedAt) &&
    isOptionalFiniteNumber(value.trashedAt) &&
    isOptionalPreviousStatus(value.previousStatus) &&
    isOptionalStringArray(value.notifiedReminderKeys) &&
    isOptionalBoolean(value.pinned)
  );
}

function isReminderSettings(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.enabled === "boolean" &&
    typeof value.leadMinutes === "number" &&
    reminderLeadMinutes.has(value.leadMinutes)
  );
}

function isIdeaSettings(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.themeMode === "string" &&
    themeModes.has(value.themeMode) &&
    typeof value.startup === "boolean" &&
    typeof value.silentStart === "boolean" &&
    typeof value.minimizeToTrayOnClose === "boolean" &&
    typeof value.appWindowControls === "boolean" &&
    typeof value.trashAutoDelete === "string" &&
    trashRetentions.has(value.trashAutoDelete) &&
    typeof value.language === "string" &&
    appLanguages.has(value.language) &&
    isReminderSettings(value.reminders) &&
    isOptionalString(value.fontFamily) &&
    isOptionalFiniteNumber(value.fontSize) &&
    (value.windowBounds === undefined || isWindowBounds(value.windowBounds))
  );
}

function sanitizeIdeaNote(note: IdeaNote): IdeaNote {
  const { previousStatus, ...rest } = note;
  if (
    note.status === "trash" &&
    (previousStatus === "active" ||
      previousStatus === "completed" ||
      previousStatus === "archive")
  ) {
    return { ...rest, previousStatus };
  }
  return rest;
}

export function validateIdeaNotesData(data: unknown): data is IdeaNotesData {
  return (
    isRecord(data) &&
    isDenseArrayOf(data.notes, isIdeaNote) &&
    isDenseArrayOf(data.tags, isIdeaTag) &&
    isIdeaSettings(data.settings)
  );
}

export function sanitizeIdeaNotesData(data: IdeaNotesData): IdeaNotesData {
  const { backgroundColor: _backgroundColor, ...settings } =
    data.settings as IdeaNotesData["settings"] & {
      backgroundColor?: unknown;
    };
  return {
    ...data,
    notes: data.notes.map(sanitizeIdeaNote),
    tags: data.tags.map((tag) => ({
      ...tag,
      color: normalizeTagColor(tag.color) ?? tag.color,
    })),
    settings,
  };
}

export function assertIdeaNotesData(data: unknown): IdeaNotesData {
  if (!validateIdeaNotesData(data)) {
    throw new Error("Invalid IdeaNotesData payload");
  }
  return data;
}
