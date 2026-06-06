// 标签纯逻辑。
// 作用：
// 1. 重命名全局标签并同步每条笔记的标签引用。
// 2. 删除全局标签并清理笔记里的孤儿标签引用。
import type { IdeaNotesData } from "../types";

export function renameTag(
  data: IdeaNotesData,
  from: string,
  to: string,
): IdeaNotesData {
  // 标签改名必须同步全局标签库和每条笔记上的标签引用。
  const nextTag = to.trim();
  if (!nextTag || data.tags.includes(nextTag)) return data;
  return {
    ...data,
    tags: data.tags.map((tag) => (tag === from ? nextTag : tag)),
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
    tags: data.tags.filter((item) => item !== tag),
    notes: data.notes.map((note) => ({
      ...note,
      tags: note.tags.filter((item) => item !== tag),
    })),
  };
}
