// Idea Notes 多语言文案类型。
// 作用：
// 1. 定义设置中心和主界面文案的完整字段契约。
// 2. 约束每个语言文件必须补齐全部文案，避免新增语言时漏翻译。
import type { NotePriority, NoteStatus } from "@shared/types";

export interface SettingsCopy {
  settingsRegion: string;
  loadingSettings: string;
  settingsCenter: string;
  reset: string;
  resetConfirm: string;
  back: string;
  appearanceSettings: string;
  systemSettings: string;
  themeMode: string;
  themeDescription: string;
  backgroundColor: string;
  backgroundDescription: string;
  startupBehavior: string;
  startupDescription: string;
  trashRetention: string;
  trashDescription: string;
  language: string;
  languageDescription: string;
  themeLight: string;
  themeDark: string;
  themeSystem: string;
  trashNever: string;
  trashSeven: string;
  trashThirty: string;
  trashNinety: string;
  languageZhCn: string;
  languageZhTw: string;
  languageEn: string;
}

export interface AppCopy {
  appTitle: string;
  alwaysOnTop: string;
  cancelAlwaysOnTop: string;
  settings: string;
  minimize: string;
  maximize: string;
  restoreWindow: string;
  close: string;
  newNote: string;
  notesNav: string;
  tagFilter: string;
  tagSettingsNav: string;
  tagSettings: string;
  toolbar: string;
  sidebarToggle: string;
  search: string;
  searchPlaceholder: string;
  priority: string;
  all: string;
  sort: string;
  sortImportant: string;
  sortNewest: string;
  sortProgress: string;
  clearTags: string;
  emptyNotes: string;
  loadingNotes: string;
  loadingTags: string;
  noDueDate: string;
  unnamedNote: string;
  statusPrefix: string;
  completionLabel: string;
  restore: string;
  permanentDelete: string;
  resume: string;
  markComplete: string;
  duplicate: string;
  delete: string;
  deleteConfirmTitle: string;
  deleteConfirmBody: string;
  cancel: string;
  confirmDelete: string;
  editNote: string;
  moreActions: string;
  menuEdit: string;
  menuComplete: string;
  menuDuplicate: string;
  menuMoveTrash: string;
  menuRestoreProgress: string;
  menuRestoreTrash: string;
  newNoteTitle: string;
  backToList: string;
  saveNote: string;
  title: string;
  titlePlaceholder: string;
  body: string;
  bodyPlaceholder: string;
  dueAt: string;
  tags: string;
  tagSettingsDescription: string;
  newTagPlaceholder: string;
  addTag: string;
  tagInputLabel: string;
  deleteTagLabel: string;
  statusLabels: Record<NoteStatus, string>;
  priorityLabels: Record<NotePriority, string>;
}
