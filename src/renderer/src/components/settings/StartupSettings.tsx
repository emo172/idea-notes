// Idea Notes 启动行为设置页面。
// 作用：
// 1. 渲染开机自启动开关。
// 2. 将开机自启动变更交给独立回调处理系统副作用和本地持久化。
import type { ReactElement } from "react";
import type { IdeaNotesData } from "@shared/types";
import type { SettingsCopy } from "../../i18n";

interface StartupSettingsProps {
  copy: SettingsCopy;
  isSaving: boolean;
  settings: IdeaNotesData["settings"];
  onStartupChange: (enabled: boolean) => Promise<void>;
}

export function StartupSettings({
  copy,
  isSaving,
  settings,
  onStartupChange,
}: StartupSettingsProps): ReactElement {
  return (
    <section className="settings-card">
      <h3>{copy.startupSettings}</h3>
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
    </section>
  );
}
