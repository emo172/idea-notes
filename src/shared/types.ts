// Idea Notes 共享类型定义。
// 作用：
// 1. 定义笔记、清单、设置、筛选条件和桌面窗口状态的数据结构。
// 2. 作为 main、preload、renderer、tests 之间的公共契约。
// 3. 约束 preload 暴露的 API 形状，避免 Electron IPC 两端类型不一致。
// 4. 让本地 JSON 持久化对象和 UI 状态使用同一套 TypeScript 类型。
// 共享类型是 main、preload、renderer 和 tests 的公共契约，避免 IPC 与界面状态各自漂移。
export type NotePriority = "high" | "medium" | "low";
export type NoteStatus = "active" | "completed" | "archive" | "trash";
export type SortMode = "important" | "newest" | "progress";
export type ThemeMode = "light" | "dark" | "system";
export type AppLanguage = "zh-CN" | "zh-TW" | "en";
export type TrashRetention = "never" | "7" | "30" | "90";
export type ImportDataMode = "overwrite" | "merge";
export type ReminderLeadMinutes = 0 | 10 | 60 | 1440;

// 清单项由正文行生成，checked 表示该行任务是否完成。
export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

// 全局标签对象承载显示名和颜色；笔记上的 tags 第一阶段仍用标签名引用。
export interface IdeaTag {
  id: string;
  name: string;
  color: string;
}

// 单条笔记的完整持久化模型，覆盖列表展示、编辑器、筛选排序和回收站状态。
export interface IdeaNote {
  id: string;
  title: string;
  body: string;
  priority: NotePriority;
  tags: string[];
  status: NoteStatus;
  checklist: ChecklistItem[];
  dueAt?: string;
  createdAt: number;
  updatedAt: number;
  trashedAt?: number;
  previousStatus?: Exclude<NoteStatus, "trash">;
  notifiedReminderKeys?: string[];
  pinned?: boolean;
}

// 用户偏好设置随主数据一起写入本地 JSON 文件。
export interface IdeaSettings {
  themeMode: ThemeMode;
  startup: boolean;
  silentStart: boolean;
  minimizeToTrayOnClose: boolean;
  appWindowControls: boolean;
  trashAutoDelete: TrashRetention;
  language: AppLanguage;
  reminders: {
    enabled: boolean;
    leadMinutes: ReminderLeadMinutes;
  };
}

// 应用持久化根对象，主进程读写磁盘时只处理这一种结构。
export interface IdeaNotesData {
  notes: IdeaNote[];
  tags: IdeaTag[];
  settings: IdeaSettings;
}

// 编辑器草稿同时服务新建和编辑；存在 id 时表示更新已有笔记。
export interface NoteDraft {
  id?: string;
  title: string;
  body: string;
  priority: NotePriority;
  tags: string[];
  dueAt?: string;
}

// 列表筛选条件由渲染层收集，再交给 shared 纯函数计算显示结果。
export interface NoteFilters {
  status: NoteStatus;
  searchQuery: string;
  priority: NotePriority | "all";
  selectedTags: string[];
  sortMode: SortMode;
}

// 完成度摘要供卡片进度条和完成度排序复用。
export interface CompletionSummary {
  completed: number;
  total: number;
  ratio: number;
}

// Electron 窗口状态由主进程返回，渲染层只负责显示和触发动作。
export interface DesktopWindowState {
  isAlwaysOnTop: boolean;
  isMaximized: boolean;
}

// 文件导入导出结果由主进程生成，renderer 只按 ok/reason 更新反馈和数据状态。
export interface DataFileResult {
  ok: boolean;
  filePath?: string;
  reason?: "cancelled" | "invalid" | "failed";
}

// preload 暴露给渲染层的唯一桌面能力入口，禁止直接暴露 ipcRenderer。
export interface IdeaNotesApi {
  getData: () => Promise<IdeaNotesData>;
  saveData: (data: IdeaNotesData) => Promise<IdeaNotesData>;
  exportData: () => Promise<DataFileResult>;
  importData: (
    mode: ImportDataMode,
  ) => Promise<DataFileResult & { data?: IdeaNotesData }>;
  getWindowState: () => Promise<DesktopWindowState>;
  minimizeWindow: () => Promise<DesktopWindowState>;
  toggleMaximizeWindow: () => Promise<DesktopWindowState>;
  closeWindow: () => Promise<void>;
  toggleAlwaysOnTop: () => Promise<DesktopWindowState>;
  setStartup: (enabled: boolean) => Promise<boolean>;
  copyToClipboard?: (text: string) => Promise<void>;
}
