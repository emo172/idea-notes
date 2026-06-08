// 本地持久化数据归一化模块。
// 作用：
// 1. 兼容旧标签对象、非法设置值和已删除设置字段。
// 2. 在读取本地 JSON 后生成 renderer 可消费的稳定数据结构。
import { defaultSettings } from "@shared/defaultData";
import { sanitizeIdeaNotesData } from "@shared/ideaNotesDataValidation";
import { createNextTag, ensureUniqueTagId } from "@shared/noteLogic";
import { normalizeTagColor } from "@shared/tags/tagColor";
import type { IdeaNotesData, IdeaTag } from "@shared/types";

const themeModes = new Set(["light", "dark", "system"]);
const trashRetentions = new Set(["never", "7", "30", "90"]);
const appLanguages = new Set(["zh-CN", "zh-TW", "en"]);
const reminderLeadMinutes = new Set([0, 10, 60, 1440]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeTagName(tag: unknown): string | null {
  if (typeof tag === "string") {
    const name = tag.trim();
    return name || null;
  }
  if (isRecord(tag) && typeof tag.name === "string") {
    const name = tag.name.trim();
    return name || null;
  }
  return null;
}

function normalizeNoteTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const normalized = tags
    .map(normalizeTagName)
    .filter((tag): tag is string => tag !== null);
  return [...new Set(normalized)];
}

function normalizeGlobalTags(tags: unknown): IdeaTag[] {
  if (!Array.isArray(tags)) return [];
  const result: IdeaTag[] = [];
  const seenNames = new Set<string>();
  for (const item of tags) {
    const name = normalizeTagName(item);
    if (!name || seenNames.has(name)) continue;
    const fallbackTag = createNextTag(name, result);
    const color =
      isRecord(item) && typeof item.color === "string"
        ? (normalizeTagColor(item.color) ?? fallbackTag.color)
        : fallbackTag.color;
    const importedId =
      isRecord(item) && typeof item.id === "string" && item.id.trim()
        ? item.id
        : fallbackTag.id;
    result.push(ensureUniqueTagId({ id: importedId, name, color }, result));
    seenNames.add(name);
  }
  return result;
}

function normalizeSettings(settings: unknown): IdeaNotesData["settings"] {
  const legacySettings = isRecord(settings) ? settings : {};
  const legacyReminders = isRecord(legacySettings.reminders)
    ? legacySettings.reminders
    : {};
  return {
    ...legacySettings,
    themeMode:
      typeof legacySettings.themeMode === "string" &&
      themeModes.has(legacySettings.themeMode)
        ? legacySettings.themeMode
        : defaultSettings.themeMode,
    startup:
      typeof legacySettings.startup === "boolean"
        ? legacySettings.startup
        : defaultSettings.startup,
    silentStart:
      typeof legacySettings.silentStart === "boolean"
        ? legacySettings.silentStart
        : defaultSettings.silentStart,
    minimizeToTrayOnClose:
      typeof legacySettings.minimizeToTrayOnClose === "boolean"
        ? legacySettings.minimizeToTrayOnClose
        : defaultSettings.minimizeToTrayOnClose,
    appWindowControls:
      typeof legacySettings.appWindowControls === "boolean"
        ? legacySettings.appWindowControls
        : defaultSettings.appWindowControls,
    trashAutoDelete:
      typeof legacySettings.trashAutoDelete === "string" &&
      trashRetentions.has(legacySettings.trashAutoDelete)
        ? legacySettings.trashAutoDelete
        : defaultSettings.trashAutoDelete,
    language:
      typeof legacySettings.language === "string" &&
      appLanguages.has(legacySettings.language)
        ? legacySettings.language
        : defaultSettings.language,
    reminders: {
      enabled:
        typeof legacyReminders.enabled === "boolean"
          ? legacyReminders.enabled
          : defaultSettings.reminders.enabled,
      leadMinutes:
        typeof legacyReminders.leadMinutes === "number" &&
        reminderLeadMinutes.has(legacyReminders.leadMinutes)
          ? legacyReminders.leadMinutes
          : defaultSettings.reminders.leadMinutes,
    },
  } as IdeaNotesData["settings"];
}

function normalizeNotifiedReminderKeys(keys: unknown): string[] | undefined {
  if (!Array.isArray(keys)) return undefined;
  const normalized = keys.filter((key): key is string => typeof key === "string");
  return normalized.length > 0 ? [...new Set(normalized)] : undefined;
}

function normalizePreviousStatus(note: IdeaNotesData["notes"][number]): {
  previousStatus?: IdeaNotesData["notes"][number]["previousStatus"];
} {
  const { previousStatus } = note;
  if (
    note.status !== "trash" ||
    (previousStatus !== "active" &&
      previousStatus !== "completed" &&
      previousStatus !== "archive")
  ) {
    return {};
  }
  return { previousStatus };
}

export function normalizeData(data: IdeaNotesData): IdeaNotesData {
  return sanitizeIdeaNotesData({
    ...data,
    tags: normalizeGlobalTags(data.tags),
    notes: data.notes.map((note) => {
      const { previousStatus: _previousStatus, ...rest } = note;
      return {
        ...rest,
        tags: normalizeNoteTags(note.tags),
        notifiedReminderKeys: normalizeNotifiedReminderKeys(note.notifiedReminderKeys),
        pinned: note.pinned === undefined ? false : note.pinned,
        ...normalizePreviousStatus(note),
      };
    }),
    settings: normalizeSettings(data.settings),
  });
}
