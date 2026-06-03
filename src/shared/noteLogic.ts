// Idea Notes 核心业务逻辑。
// 作用：
// 1. 实现笔记创建、复制、完成状态、回收站、标签同步和设置更新等纯函数。
// 2. 实现搜索、标签交集、优先级和排序规则，供渲染层列表复用。
// 3. 将可测试的业务规则从 React 组件中拆出，避免 UI 与数据规则耦合。
// 4. 让 tests/shared 能在不启动 Electron 的情况下验证核心行为。
import type {
  CompletionSummary,
  IdeaNote,
  IdeaNotesData,
  IdeaSettings,
  NoteDraft,
  NoteFilters,
} from "./types";

// 业务纯函数集中在 shared 层，便于 renderer 复用，也便于 Vitest 在不启动 Electron 时验证。
interface MutationOptions {
  now?: number;
  id?: string;
}

const priorityRank = {
  high: 0,
  medium: 1,
  low: 2,
} as const;

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

// 搜索只匹配标题和正文，标签筛选由 selectedTags 单独处理，避免筛选语义混乱。
function includesSearchText(note: IdeaNote, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return `${note.title}\n${note.body}`.toLowerCase().includes(normalizedQuery);
}

export function createNote(
  input: NoteDraft,
  options: MutationOptions = {},
): IdeaNote {
  // 新建笔记时一次性确定 id、时间戳和清单项，保证后续持久化对象完整。
  const now = options.now ?? Date.now();
  const id = options.id ?? `note-${now}`;
  return {
    id,
    title: input.title,
    body: input.body,
    priority: input.priority,
    tags: input.tags,
    status: "active",
    checklist: buildChecklistItems(input.body, id),
    dueAt: input.dueAt,
    createdAt: now,
    updatedAt: now,
  };
}

export function saveNote(
  data: IdeaNotesData,
  input: NoteDraft,
  options: MutationOptions = {},
): IdeaNotesData {
  // 新笔记插入列表顶部，保证刚创建的内容立即出现在用户视野中。
  return { ...data, notes: [createNote(input, options), ...data.notes] };
}

export function duplicateNote(
  note: IdeaNote,
  options: MutationOptions = {},
): IdeaNote {
  // 复制笔记保留原内容和状态，只更新身份、标题后缀与时间戳。
  const now = options.now ?? Date.now();
  return {
    ...note,
    id: options.id ?? `note-${now}`,
    title: `${note.title} 副本`,
    createdAt: now,
    updatedAt: now,
  };
}

export function getCompletion(_note: IdeaNote): CompletionSummary {
  // 没有清单项时完成度固定为 0，避免除零并保持排序可预测。
  const total = _note.checklist.length;
  const completed = _note.checklist.filter((item) => item.checked).length;
  return { completed, total, ratio: total === 0 ? 0 : completed / total };
}

export function filterAndSortNotes(
  notes: IdeaNote[],
  filters: NoteFilters,
): IdeaNote[] {
  // 先过滤视图状态，再叠加优先级、标签交集和文本搜索，最后按用户选择排序。
  return notes
    .filter((note) => note.status === filters.status)
    .filter(
      (note) =>
        filters.priority === "all" || note.priority === filters.priority,
    )
    .filter((note) =>
      filters.selectedTags.every((tag) => note.tags.includes(tag)),
    )
    .filter((note) => includesSearchText(note, filters.searchQuery))
    .sort((left, right) => {
      if (filters.sortMode === "newest")
        return right.updatedAt - left.updatedAt;
      if (filters.sortMode === "progress")
        return getCompletion(right).ratio - getCompletion(left).ratio;
      const priorityDelta =
        priorityRank[left.priority] - priorityRank[right.priority];
      return priorityDelta === 0
        ? right.updatedAt - left.updatedAt
        : priorityDelta;
    });
}

export function toggleChecklistItem(
  note: IdeaNote,
  itemId: string,
  checked: boolean,
  now = Date.now(),
): IdeaNote {
  // 只更新目标清单项，其他清单状态保持不变。
  return {
    ...note,
    updatedAt: now,
    checklist: note.checklist.map((item) =>
      item.id === itemId ? { ...item, checked } : item,
    ),
  };
}

export function toggleNoteCompleted(
  note: IdeaNote,
  now = Date.now(),
): IdeaNote {
  // 完成态和进行中互相切换；回收站笔记不会在 UI 中触发这个动作。
  return {
    ...note,
    status: note.status === "completed" ? "active" : "completed",
    updatedAt: now,
  };
}

export function moveNoteToTrash(note: IdeaNote, now = Date.now()): IdeaNote {
  // 移入回收站时保留全部内容，并记录 trashedAt 供后续保留时间策略使用。
  return { ...note, status: "trash", updatedAt: now, trashedAt: now };
}

export function restoreNoteFromTrash(
  note: IdeaNote,
  now = Date.now(),
): IdeaNote {
  // 从回收站恢复时回到进行中，并移除回收时间戳。
  const { trashedAt: _trashedAt, ...rest } = note;
  return { ...rest, status: "active", updatedAt: now };
}

export function permanentlyDeleteNote(
  notes: IdeaNote[],
  noteId: string,
): IdeaNote[] {
  // 彻底删除是唯一从 notes 数组移除元素的动作。
  return notes.filter((note) => note.id !== noteId);
}

export function permanentlyDeleteAllTrash(notes: IdeaNote[]): IdeaNote[] {
  // 清空回收站只移除回收站笔记，避免误删进行中和已完成内容。
  return notes.filter((note) => note.status !== "trash");
}

export function renameTag(
  data: IdeaNotesData,
  from: string,
  to: string,
): IdeaNotesData {
  // 标签改名必须同步全局标签库和每条笔记上的标签引用。
  return {
    ...data,
    tags: data.tags.map((tag) => (tag === from ? to : tag)),
    notes: data.notes.map((note) => ({
      ...note,
      tags: note.tags.map((tag) => (tag === from ? to : tag)),
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

export function updateSettings(
  data: IdeaNotesData,
  settings: Partial<IdeaSettings>,
): IdeaNotesData {
  // 设置更新使用浅合并，避免修改单个偏好时覆盖其他设置。
  return { ...data, settings: { ...data.settings, ...settings } };
}
