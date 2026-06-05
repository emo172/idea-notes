// Idea Notes 系统设置组件。
// 作用：
// 1. 渲染设置中心系统页签中的开机自启动、回收站保留和语言设置。
// 2. 保持开机自启动走独立回调，其余设置变更交给 App 统一持久化。
import type { ReactElement } from "react";
import type { AppLanguage, IdeaNotesData, TrashRetention } from "@shared/types";
import type { SettingsCopy } from "../../i18n";

const languageLabels: Record<AppLanguage, string> = {
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  en: "English",
};

interface SystemSettingsProps {
  copy: SettingsCopy;
  isSaving: boolean;
  settings: IdeaNotesData["settings"];
  onSettingsChange: (settings: Partial<IdeaNotesData["settings"]>) => Promise<void>;
  onStartupChange: (enabled: boolean) => Promise<void>;
}

export function SystemSettings({
  copy,
  isSaving,
  settings,
  onSettingsChange,
  onStartupChange,
}: SystemSettingsProps): ReactElement {
  return (
    <section className="settings-card">
      <h3>{copy.systemSettings}</h3>
      <div className="setting-row">
        <span className="setting-copy">
          <span>{copy.startupBehavior}</span>
          <small>{copy.startupDescription}</small>
        </span>
        <label className="switch">
          <input
            type="checkbox"
            aria-label={`${copy.startupBehavior} ${copy.startupDescription}`}
            disabled={isSaving}
            checked={settings.startup}
            onChange={(event) => onStartupChange(event.target.checked)}
          />
          <span className="switch-slider" aria-hidden="true" />
        </label>
      </div>
      <label className="setting-row">
        <span className="setting-copy">
          <span>{copy.trashRetention}</span>
          <small>{copy.trashDescription}</small>
        </span>
        <select
          disabled={isSaving}
          value={settings.trashAutoDelete}
          onChange={(event) =>
            onSettingsChange({
              trashAutoDelete: event.target.value as TrashRetention,
            })
          }
        >
          <option value="never">{copy.trashNever}</option>
          <option value="7">{copy.trashSeven}</option>
          <option value="30">{copy.trashThirty}</option>
          <option value="90">{copy.trashNinety}</option>
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
