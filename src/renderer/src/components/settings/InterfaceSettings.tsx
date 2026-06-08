// Idea Notes 界面设置页面。
// 作用：
// 1. 渲染主题模式和界面语言设置。
// 2. 将纯界面偏好变更交给 SettingsPanel 和 App 持久化。
import type { ReactElement } from "react";
import { defaultSettings } from "@shared/defaultData";
import type { AppLanguage, IdeaNotesData, ThemeMode } from "@shared/types";
import type { SettingsCopy } from "../../i18n";

const languageLabels: Record<AppLanguage, string> = {
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  en: "English",
};

const fontFamilyOptions = [
  { value: "system", labelKey: "fontSystemDefault" },
  { value: "SimSun, serif", labelKey: "fontSimSun" },
  { value: "SimHei, sans-serif", labelKey: "fontSimHei" },
  { value: "KaiTi, serif", labelKey: "fontKaiTi" },
  { value: "DengXian, sans-serif", labelKey: "fontDengXian" },
  { value: "Consolas, monospace", labelKey: "fontConsolas" },
  { value: "Monaco, monospace", labelKey: "fontMonaco" },
] satisfies Array<{
  value: string;
  labelKey:
    | "fontSystemDefault"
    | "fontSimSun"
    | "fontSimHei"
    | "fontKaiTi"
    | "fontDengXian"
    | "fontConsolas"
    | "fontMonaco";
}>;

const fontSizeOptions = [12, 14, 16, 18, 20, 22, 24];

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
      <label className="setting-row">
        <span className="setting-copy">
          <span>{copy.fontFamily}</span>
        </span>
        <select
          disabled={isSaving}
          value={settings.fontFamily ?? defaultSettings.fontFamily}
          onChange={(event) =>
            onSettingsChange({
              fontFamily: event.target.value,
            })
          }
        >
          {fontFamilyOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {copy[option.labelKey]}
            </option>
          ))}
        </select>
      </label>
      <label className="setting-row">
        <span className="setting-copy">
          <span>{copy.fontSize}</span>
        </span>
        <select
          disabled={isSaving}
          value={settings.fontSize ?? defaultSettings.fontSize}
          onChange={(event) =>
            onSettingsChange({
              fontSize: Number(event.target.value),
            })
          }
        >
          {fontSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
