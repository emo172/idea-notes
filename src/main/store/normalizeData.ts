// 本地持久化数据归一化模块。
// 作用：
// 1. 兼容旧标签对象、非法设置值和已删除设置字段。
// 2. 在读取本地 JSON 后生成 renderer 可消费的稳定数据结构。
import { defaultSettings } from "@shared/defaultData";
import { sanitizeIdeaNotesData } from "@shared/ideaNotesDataValidation";
import type { IdeaNotesData } from "@shared/types";

const themeModes = new Set(["light", "dark", "system"]);
const trashRetentions = new Set(["never", "7", "30", "90"]);
const appLanguages = new Set(["zh-CN", "zh-TW", "en"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeTag(tag: unknown): string | null {
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

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const normalized = tags
    .map(normalizeTag)
    .filter((tag): tag is string => tag !== null);
  return [...new Set(normalized)];
}

function normalizeSettings(settings: unknown): IdeaNotesData["settings"] {
  const legacySettings = isRecord(settings) ? settings : {};
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
  } as IdeaNotesData["settings"];
}

export function normalizeData(data: IdeaNotesData): IdeaNotesData {
  return sanitizeIdeaNotesData({
    ...data,
    tags: normalizeTags(data.tags),
    notes: data.notes.map((note) => ({
      ...note,
      tags: normalizeTags(note.tags),
    })),
    settings: normalizeSettings(data.settings),
  });
}
