// Idea Notes 启动行为设置页面。
// 作用：
// 1. 渲染开机自启动、静默启动、托盘关闭和窗口按钮开关。
// 2. 将开机自启动变更交给独立回调处理系统副作用和本地持久化。
import type { ReactElement } from "react";
import type { IdeaNotesData } from "@shared/types";
import type { SettingsCopy } from "../../i18n";

interface StartupSettingsProps {
  copy: SettingsCopy;
  isSaving: boolean;
  settings: IdeaNotesData["settings"];
  onSettingsChange: (settings: Partial<IdeaNotesData["settings"]>) => Promise<void>;
  onStartupChange: (enabled: boolean) => Promise<void>;
}

function renderSwitchRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (enabled: boolean) => void;
}): ReactElement {
  return (
    <div className="setting-row">
      <span className="setting-copy">
        <span>{label}</span>
        <small>{description}</small>
      </span>
      <label className="switch">
        <input
          type="checkbox"
          aria-label={`${label} ${description}`}
          disabled={disabled}
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="switch-slider" aria-hidden="true" />
      </label>
    </div>
  );
}

export function StartupSettings({
  copy,
  isSaving,
  settings,
  onSettingsChange,
  onStartupChange,
}: StartupSettingsProps): ReactElement {
  return (
    <section className="settings-card">
      <h3>{copy.startupSettings}</h3>
      {renderSwitchRow({
        label: copy.startupBehavior,
        description: copy.startupDescription,
        checked: settings.startup,
        disabled: isSaving,
        onChange: onStartupChange,
      })}
      {renderSwitchRow({
        label: copy.silentStart,
        description: copy.silentStartDescription,
        checked: settings.silentStart,
        disabled: isSaving,
        onChange: (silentStart) => onSettingsChange({ silentStart }),
      })}
      {renderSwitchRow({
        label: copy.minimizeToTrayOnClose,
        description: copy.minimizeToTrayOnCloseDescription,
        checked: settings.minimizeToTrayOnClose,
        disabled: isSaving,
        onChange: (minimizeToTrayOnClose) =>
          onSettingsChange({ minimizeToTrayOnClose }),
      })}
      {renderSwitchRow({
        label: copy.appWindowControls,
        description: copy.appWindowControlsDescription,
        checked: settings.appWindowControls,
        disabled: isSaving,
        onChange: (appWindowControls) => onSettingsChange({ appWindowControls }),
      })}
    </section>
  );
}
