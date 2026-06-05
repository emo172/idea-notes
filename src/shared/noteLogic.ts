// Idea Notes 核心业务逻辑聚合导出。
// 作用：
// 1. 保持既有 `@shared/noteLogic` 导入路径稳定。
// 2. 将笔记、清单、回收站、标签和设置纯逻辑拆到更小模块。
// 3. 降低 shared 单文件复杂度，同时避免 renderer 和测试一次性改大量 import。
export {
  buildChecklistItems,
  getCompletion,
  toggleChecklistItem,
} from "./notes/checklistLogic";
export { filterAndSortNotes } from "./notes/noteFilters";
export { createNote, duplicateNote, saveNote } from "./notes/noteMutations";
export {
  moveNoteToTrash,
  permanentlyDeleteAllTrash,
  permanentlyDeleteNote,
  purgeExpiredTrash,
  restoreNoteFromTrash,
  toggleNoteCompleted,
} from "./notes/trashLogic";
export { deleteTag, renameTag } from "./tags/tagLogic";
export { updateSettings } from "./settings/settingsLogic";
