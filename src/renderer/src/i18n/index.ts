// Idea Notes 多语言文案出口。
// 作用：
// 1. 汇总每个语言文件，向组件提供稳定的 appCopy 和 settingsCopy。
// 2. 统一导出文案类型，避免组件感知具体语言文件路径。
import type { AppLanguage } from "@shared/types";
import { en, enSettings } from "./en";
import type { AppCopy, SettingsCopy } from "./types";
import { zhCN, zhCNSettings } from "./zh-CN";
import { zhTW, zhTWSettings } from "./zh-TW";

export type { AppCopy, SettingsCopy } from "./types";

export const settingsCopy: Record<AppLanguage, SettingsCopy> = {
  "zh-CN": zhCNSettings,
  "zh-TW": zhTWSettings,
  en: enSettings,
};

export const appCopy: Record<AppLanguage, AppCopy> = {
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  en,
};
