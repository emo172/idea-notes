// IdeaNotesData 运行时结构校验模块。
// 作用：
// 1. 为主进程 IPC 保存入口提供运行时 payload 校验。
// 2. 锁定持久化根对象、笔记、清单和设置的必需字段。
// 3. 允许对象携带额外字段，兼容旧本地数据中的残留字段。
import type { IdeaNotesData } from "./types";

const notePriorities = new Set(["high", "medium", "low"]);
const noteStatuses = new Set(["active", "completed", "trash"]);
const themeModes = new Set(["light", "dark", "system"]);
const trashRetentions = new Set(["never", "7", "30", "90"]);
const appLanguages = new Set(["zh-CN", "zh-TW", "en"]);

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
  return isDenseArrayOf(
    value,
    (item) => typeof item === "string",
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
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
    isOptionalFiniteNumber(value.trashedAt)
  );
}

function isIdeaSettings(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.themeMode === "string" &&
    themeModes.has(value.themeMode) &&
    typeof value.startup === "boolean" &&
    typeof value.trashAutoDelete === "string" &&
    trashRetentions.has(value.trashAutoDelete) &&
    typeof value.language === "string" &&
    appLanguages.has(value.language)
  );
}

export function validateIdeaNotesData(data: unknown): data is IdeaNotesData {
  return (
    isRecord(data) &&
    isDenseArrayOf(data.notes, isIdeaNote) &&
    isStringArray(data.tags) &&
    isIdeaSettings(data.settings)
  );
}

export function sanitizeIdeaNotesData(data: IdeaNotesData): IdeaNotesData {
  const { backgroundColor: _backgroundColor, ...settings } =
    data.settings as IdeaNotesData["settings"] & {
      backgroundColor?: unknown;
    };
  return { ...data, settings };
}

export function assertIdeaNotesData(data: unknown): IdeaNotesData {
  if (!validateIdeaNotesData(data)) {
    throw new Error("Invalid IdeaNotesData payload");
  }
  return data;
}
