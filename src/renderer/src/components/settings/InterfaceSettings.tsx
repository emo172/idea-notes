// Idea Notes 界面设置页面。
// 作用：
// 1. 渲染主题模式和界面语言设置。
// 2. 将纯界面偏好变更交给 SettingsPanel 和 App 持久化。
import type { ReactElement } from "react";
import type { AppLanguage, IdeaNotesData, ThemeMode } from "@shared/types";
import type { SettingsCopy } from "../../i18n";

const languageLabels: Record<AppLanguage, string> = {
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  en: "English",
};

interface InterfaceSettingsProps {
  copy: SettingsCopy;
  isSaving: boolean;
  settings: IdeaNotesData["settings"];
  onSettingsChange: (settings: Partial<IdeaNotesData["settings"]>) => Promise<void>;
}

export function InterfaceSettings({
  copy,
  isSaving,
  settings,
  onSettingsChange,
}: InterfaceSettingsProps): ReactElement {
  return (
    <section className="settings-card">
      <h3>{copy.interfaceSettings}</h3>
      <label className="setting-row">
        <span className="setting-copy">
          <span>{copy.themeMode}</span>
          <small>{copy.themeDescription}</small>
        </span>
        <select
          disabled={isSaving}
          value={settings.themeMode}
          onChange={(event) =>
            onSettingsChange({
              themeMode: event.target.value as ThemeMode,
            })
          }
        >
          <option value="light">{copy.themeLight}</option>
          <option value="dark">{copy.themeDark}</option>
          <option value="system">{copy.themeSystem}</option>
        </select>
      </label>
      <label className="setting-row">
        <span className="setting-copy">
          <span>{copy.language}</span>
          <small>{copy.languageDescription}</small>
        </span>
        <select
          disabled={isSaving}
          value={settings.language}
          onChange={(event) =>
            onSettingsChange({
              language: event.target.value as AppLanguage,
            })
          }
        >
          <option value="zh-CN">{languageLabels["zh-CN"]}</option>
          <option value="zh-TW">{languageLabels["zh-TW"]}</option>
          <option value="en">{languageLabels.en}</option>
        </select>
      </label>
    </section>
  );
}
