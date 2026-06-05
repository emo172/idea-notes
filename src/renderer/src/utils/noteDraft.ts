// Idea Notes 笔记草稿工具。
// 作用：
// 1. 提供编辑器草稿默认值和笔记到草稿的转换逻辑。
// 2. 保存编辑结果时重建清单，并尽量保留相同位置同文本清单项的勾选状态。
import { buildChecklistItems } from "@shared/noteLogic";
import type { IdeaNote, NoteDraft } from "@shared/types";

export const initialDraft: NoteDraft = {
  title: "",
  body: "",
  priority: "medium",
  tags: [],
};

export function buildDraftFromNote(note: IdeaNote): NoteDraft {
  return {
    id: note.id,
    title: note.title,
    body: note.body,
    priority: note.priority,
    tags: note.tags,
    dueAt: note.dueAt,
  };
}

export function draftToUpdatedNote(
  note: IdeaNote,
  draft: NoteDraft,
  fallbackTitle: string,
): IdeaNote {
  const checklist = buildChecklistItems(draft.body, note.id, (text, index) =>
    note.checklist[index]?.text === text ? note.checklist[index].checked : false,
  );

  return {
    ...note,
    title: draft.title.trim() || fallbackTitle,
    body: draft.body,
    priority: draft.priority,
    tags: draft.tags,
    dueAt: draft.dueAt,
    checklist,
    updatedAt: Date.now(),
  };
}
