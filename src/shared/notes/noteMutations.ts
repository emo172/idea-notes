// 笔记创建与复制纯逻辑。
// 作用：
// 1. 创建完整的新笔记对象。
// 2. 将新笔记插入持久化数据。
// 3. 复制已有笔记并生成新身份。
import type { IdeaNote, IdeaNotesData, NoteDraft } from "../types";
import { buildChecklistItems } from "./checklistLogic";

// 业务纯函数集中在 shared 层，便于 renderer 复用，也便于 Vitest 在不启动 Electron 时验证。
interface MutationOptions {
  now?: number;
  id?: string;
}

interface DuplicateNoteOptions extends MutationOptions {
  titleSuffix?: string;
}

let generatedIdSequence = 0;

function generateNoteId(now: number): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `note-${globalThis.crypto.randomUUID()}`;
  }
  generatedIdSequence += 1;
  return `note-${now}-${generatedIdSequence}`;
}

export function createNote(input: NoteDraft, options: MutationOptions = {}): IdeaNote {
  // 新建笔记时一次性确定 id、时间戳和清单项，保证后续持久化对象完整。
  const now = options.now ?? Date.now();
  const id = options.id ?? generateNoteId(now);
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
  options: DuplicateNoteOptions = {},
): IdeaNote {
  // 复制笔记保留原内容和状态，只更新身份、标题后缀、清单项身份与时间戳。
  const now = options.now ?? Date.now();
  const id = options.id ?? generateNoteId(now);
  return {
    ...note,
    id,
    title: `${note.title}${options.titleSuffix ?? ""}`,
    checklist: note.checklist.map((item, index) => ({
      ...item,
      id: `${id}-item-${index + 1}`,
    })),
    createdAt: now,
    updatedAt: now,
  };
}
