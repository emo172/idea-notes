// Idea Notes 设置中心组件。
// 作用：
// 1. 渲染外观设置和系统设置两个页签。
// 2. 将设置变更、开机自启动和重置动作通过回调交给 App 统一持久化。
import { useState } from "react";
import type { ReactElement } from "react";
import {
  ArrowCounterClockwiseIcon,
  ArrowLeftIcon,
} from "@phosphor-icons/react";
import type { AppLanguage, IdeaNotesData } from "@shared/types";
import { AppButton } from "../ui/AppButton";
import { settingsCopy } from "../../i18n";
import { AppearanceSettings } from "./AppearanceSettings";
import { SettingsTabs } from "./SettingsTabs";
import type { SettingsTab } from "./SettingsTabs";
import { SystemSettings } from "./SystemSettings";

interface SettingsPanelProps {
  data: IdeaNotesData | null;
  language: AppLanguage;
  isSaving?: boolean;
  saveError?: string | null;
  onSettingsChange: (
    settings: Partial<IdeaNotesData["settings"]>,
  ) => Promise<void>;
  onStartupChange: (enabled: boolean) => Promise<void>;
  onResetSettings: () => void;
  onBack: () => void;
}

export function SettingsPanel({
  data,
  language,
  isSaving = false,
  saveError = null,
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
            disabled={isSaving}
            icon={<ArrowCounterClockwiseIcon weight="bold" />}
            onClick={onResetSettings}
          >
            {copy.reset}
          </AppButton>
          <AppButton
            className="icon-btn"
            disabled={isSaving}
            icon={<ArrowLeftIcon weight="bold" />}
            onClick={onBack}
          >
            {copy.back}
          </AppButton>
        </div>
      </header>
      <div className="settings-body">
        <SettingsTabs
          activeTab={activeTab}
          copy={copy}
          isSaving={isSaving}
          onTabChange={setActiveTab}
        />
        <div className="settings-main">
          {saveError ? (
            <div className="app-error-alert settings-error-alert" role="alert">
              {saveError}
            </div>
          ) : null}
          {activeTab === "appearance" ? (
            <AppearanceSettings
              copy={copy}
              isSaving={isSaving}
              settings={settings}
              onSettingsChange={onSettingsChange}
            />
          ) : (
            <SystemSettings
              copy={copy}
              isSaving={isSaving}
              settings={settings}
              onSettingsChange={onSettingsChange}
              onStartupChange={onStartupChange}
            />
          )}
        </div>
      </div>
    </section>
  );
}
