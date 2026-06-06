// Idea Notes 默认数据模块。
// 作用：
// 1. 提供首次启动时写入本地 JSON 的默认设置和种子笔记。
// 2. 让空数据状态下的桌面应用仍能展示列表、标签、清单和进度条效果。
// 3. 为测试提供稳定的默认数据入口，减少测试重复构造样板数据。
import type { IdeaNotesData, IdeaSettings } from "./types";
import { createTag } from "./tags/tagLogic";

// 默认设置用于首次启动、数据文件缺失或后续重置设置时初始化应用偏好。
export const defaultSettings: IdeaSettings = {
  themeMode: "light",
  startup: false,
  trashAutoDelete: "never",
  language: "zh-CN",
  reminders: {
    enabled: false,
    leadMinutes: 10,
  },
};

export function getDefaultData(now = Date.now()): IdeaNotesData {
  // 首次启动时提供少量种子数据，让用户能直接看到列表、清单、标签和进度条效果。
  const tags = ["工作", "灵感", "待办"].map(createTag);
  return {
    tags,
    settings: { ...defaultSettings },
    notes: [
      {
        id: "seed-navigation",
        title: "重构 Desktop App 导航栏",
        body: "实现可拖拽的 Titlebar\n添加窗口控制\n增加置顶按钮\n修复深色模式图标对比度",
        priority: "high",
        tags: ["工作", "待办"],
        status: "active",
        checklist: [
          {
            id: "seed-navigation-item-1",
            text: "实现可拖拽的 Titlebar",
            checked: true,
          },
          { id: "seed-navigation-item-2", text: "添加窗口控制", checked: true },
          {
            id: "seed-navigation-item-3",
            text: "增加置顶按钮",
            checked: false,
          },
          {
            id: "seed-navigation-item-4",
            text: "修复深色模式图标对比度",
            checked: false,
          },
        ],
        dueAt: "2026-05-24T18:00",
        createdAt: now - 86_400_000,
        updatedAt: now - 3_600_000,
      },
      {
        id: "seed-naming",
        title: "产品命名灵感",
        body: "Idea Notes\nSpark Pad\nMemo Garden",
        priority: "medium",
        tags: ["工作", "灵感"],
        status: "active",
        checklist: [],
        createdAt: now - 172_800_000,
        updatedAt: now - 7_200_000,
      },
    ],
  };
}
