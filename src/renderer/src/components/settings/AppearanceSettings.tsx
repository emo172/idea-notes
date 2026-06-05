// Idea Notes 外观设置组件。
// 作用：
// 1. 渲染设置中心外观页签中的主题模式设置。
// 2. 将主题设置变更通过回调交给 SettingsPanel 和 App 持久化。
import type { ReactElement } from "react";
import type { IdeaNotesData, ThemeMode } from "@shared/types";
import type { SettingsCopy } from "../../i18n";

interface AppearanceSettingsProps {
  copy: SettingsCopy;
  isSaving: boolean;
  settings: IdeaNotesData["settings"];
  onSettingsChange: (settings: Partial<IdeaNotesData["settings"]>) => Promise<void>;
}

export function AppearanceSettings({
  copy,
  isSaving,
  settings,
  onSettingsChange,
}: AppearanceSettingsProps): ReactElement {
  return (
    <section className="settings-card">
      <h3>{copy.appearanceSettings}</h3>
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
    </section>
  );
}
