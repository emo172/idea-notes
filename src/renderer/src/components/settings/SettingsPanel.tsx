// Idea Notes 设置中心组件。
// 作用：
// 1. 渲染外观设置和系统设置两个页签。
// 2. 将设置变更、开机自启动和重置动作通过回调交给 App 统一持久化。
import { useState } from "react";
import type { ReactElement } from "react";
import {
  ArrowCounterClockwiseIcon,
  ArrowLeftIcon,
  DesktopIcon,
  PaintBrushIcon,
} from "@phosphor-icons/react";
import type {
  AppLanguage,
  IdeaNotesData,
  ThemeMode,
  TrashRetention,
} from "@shared/types";
import { AppButton } from "../ui/AppButton";
import { settingsCopy } from "../../i18n";

type SettingsTab = "appearance" | "system";

const languageLabels: Record<AppLanguage, string> = {
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  en: "English",
};

interface SettingsPanelProps {
  data: IdeaNotesData | null;
  language: AppLanguage;
  onSettingsChange: (
    settings: Partial<IdeaNotesData["settings"]>,
  ) => Promise<void>;
  onStartupChange: (enabled: boolean) => Promise<void>;
  onResetSettings: () => Promise<void>;
  onBack: () => void;
}

export function SettingsPanel({
  data,
  language,
  onSettingsChange,
  onStartupChange,
  onResetSettings,
  onBack,
}: SettingsPanelProps): ReactElement {
  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");

  if (!data)
    return (
      <div className="empty-state">
        {settingsCopy[language].loadingSettings}
      </div>
    );
  const { settings } = data;
  const copy = settingsCopy[settings.language];

  return (
    <section className="settings-view" aria-label={copy.settingsRegion}>
      <header className="settings-head">
        <h2>{copy.settingsCenter}</h2>
        <div className="settings-actions">
          <AppButton
            className="icon-btn"
            icon={<ArrowCounterClockwiseIcon weight="bold" />}
            onClick={onResetSettings}
          >
            {copy.reset}
          </AppButton>
          <AppButton
            className="icon-btn"
            icon={<ArrowLeftIcon weight="bold" />}
            onClick={onBack}
          >
            {copy.back}
          </AppButton>
        </div>
      </header>
      <div className="settings-body">
        <div className="settings-sidebar">
          <AppButton
            className="settings-tab"
            variant="tab"
            active={activeTab === "appearance"}
            icon={<PaintBrushIcon weight="bold" />}
            onClick={() => setActiveTab("appearance")}
          >
            {copy.appearanceSettings}
          </AppButton>
          <AppButton
            className="settings-tab"
            variant="tab"
            active={activeTab === "system"}
            icon={<DesktopIcon weight="bold" />}
            onClick={() => setActiveTab("system")}
          >
            {copy.systemSettings}
          </AppButton>
        </div>
        <div className="settings-main">
          {activeTab === "appearance" ? (
            <section className="settings-card">
              <h3>{copy.appearanceSettings}</h3>
              <label className="setting-row">
                <span className="setting-copy">
                  <span>{copy.themeMode}</span>
                  <small>{copy.themeDescription}</small>
                </span>
                <select
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
                  <span>{copy.backgroundColor}</span>
                  <small>{copy.backgroundDescription}</small>
                </span>
                <input
                  type="color"
                  value={settings.backgroundColor}
                  onChange={(event) =>
                    onSettingsChange({ backgroundColor: event.target.value })
                  }
                />
              </label>
            </section>
          ) : (
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
          )}
        </div>
      </div>
    </section>
  );
}
