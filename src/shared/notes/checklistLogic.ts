// 笔记清单纯逻辑。
// 作用：
// 1. 从正文生成清单项。
// 2. 计算清单完成度。
// 3. 更新单个清单项状态。
import type { CompletionSummary, IdeaNote } from "../types";

// 正文中的每个非空行都会转为清单项，这是编辑器“按行生成任务”的核心规则。
export function buildChecklistItems(
  body: string,
  noteId: string,
  getChecked: (text: string, index: number) => boolean = () => false,
): IdeaNote["checklist"] {
  return body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text, index) => ({
      id: `${noteId}-item-${index + 1}`,
      text,
      checked: getChecked(text, index),
    }));
}

export function getCompletion(_note: IdeaNote): CompletionSummary {
  // 没有清单项时完成度固定为 0，避免除零并保持排序可预测。
  const total = _note.checklist.length;
  const completed = _note.checklist.filter((item) => item.checked).length;
  return { completed, total, ratio: total === 0 ? 0 : completed / total };
}

export function toggleChecklistItem(
  note: IdeaNote,
  itemId: string,
  checked: boolean,
  now = Date.now(),
): IdeaNote {
  // 只更新目标清单项，其他清单状态保持不变。
  if (!note.checklist.some((item) => item.id === itemId)) return note;
  return {
    ...note,
    updatedAt: now,
    checklist: note.checklist.map((item) =>
      item.id === itemId ? { ...item, checked } : item,
    ),
  };
}
