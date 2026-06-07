// 标签纯逻辑。
// 作用：
// 1. 重命名全局标签并同步每条笔记的标签引用。
// 2. 删除全局标签并清理笔记里的孤儿标签引用。
import type { IdeaNotesData, IdeaTag } from "../types";
import { normalizeTagColor } from "./tagColor";

export const tagColorPalette = [
  "#2563eb",
  "#7c3aed",
  "#f97316",
  "#10b981",
  "#dc2626",
  "#0f766e",
] as const;

export function createTag(name: string, index: number): IdeaNotesData["tags"][number] {
  return {
    id: `tag-${index + 1}`,
    name,
    color: tagColorPalette[index % tagColorPalette.length],
  };
}

const tagIdPattern = /^tag-(\d+)$/;

function getTagIdSequence(id: string): number | null {
  const match = tagIdPattern.exec(id);
  if (!match) return null;
  const sequence = Number.parseInt(match[1], 10);
  return Number.isSafeInteger(sequence) && sequence > 0 ? sequence : null;
}

function getNextTagSequence(tags: IdeaTag[]): number {
  return tags.reduce((nextSequence, tag) => {
    const sequence = getTagIdSequence(tag.id);
    return sequence !== null && sequence >= nextSequence ? sequence + 1 : nextSequence;
  }, 1);
}

export function createNextTag(name: string, tags: IdeaTag[]): IdeaTag {
  return {
    id: `tag-${getNextTagSequence(tags)}`,
    name,
    color: tagColorPalette[tags.length % tagColorPalette.length],
  };
}

export function ensureUniqueTagId(tag: IdeaTag, tags: IdeaTag[]): IdeaTag {
  const usedIds = new Set(tags.map((item) => item.id));
  if (!usedIds.has(tag.id)) return tag;
  return {
    ...tag,
    id: `tag-${getNextTagSequence(tags)}`,
  };
}

export function renameTag(
  data: IdeaNotesData,
  from: string,
  to: string,
): IdeaNotesData {
  // 标签改名必须同步全局标签库和每条笔记上的标签引用。
  const nextTag = to.trim();
  if (!nextTag || data.tags.some((tag) => tag.name === nextTag)) return data;
  return {
    ...data,
    tags: data.tags.map((tag) => (tag.name === from ? { ...tag, name: nextTag } : tag)),
    notes: data.notes.map((note) => ({
      ...note,
      tags: note.tags.map((tag) => (tag === from ? nextTag : tag)),
    })),
  };
}

export function deleteTag(data: IdeaNotesData, tag: string): IdeaNotesData {
  // 删除标签时同时清理笔记里的引用，避免出现无法筛选的孤儿标签。
  return {
    ...data,
    tags: data.tags.filter((item) => item.name !== tag),
    notes: data.notes.map((note) => ({
      ...note,
      tags: note.tags.filter((item) => item !== tag),
    })),
  };
}

export function updateTagColor(
  data: IdeaNotesData,
  tagName: string,
  color: string,
): IdeaNotesData {
  const normalizedColor = normalizeTagColor(color);
  if (!normalizedColor || !data.tags.some((tag) => tag.name === tagName)) return data;
  return {
    ...data,
    tags: data.tags.map((tag) =>
      tag.name === tagName ? { ...tag, color: normalizedColor } : tag,
    ),
  };
}
