// Idea Notes 设置页签组件。
// 作用：
// 1. 渲染设置中心左侧外观设置和系统设置页签。
// 2. 将页签切换状态通过回调交给 SettingsPanel 维护。
import type { ReactElement } from "react";
import { DesktopIcon, PaintBrushIcon } from "@phosphor-icons/react";
import { AppButton } from "../ui/AppButton";
import type { SettingsCopy } from "../../i18n";

export type SettingsTab = "appearance" | "system";

interface SettingsTabsProps {
  activeTab: SettingsTab;
  copy: SettingsCopy;
  isSaving: boolean;
  onTabChange: (tab: SettingsTab) => void;
}

export function SettingsTabs({
  activeTab,
  copy,
  isSaving,
  onTabChange,
}: SettingsTabsProps): ReactElement {
  return (
    <div className="settings-sidebar">
      <AppButton
        className="settings-tab"
        variant="tab"
        active={activeTab === "appearance"}
        disabled={isSaving}
        icon={<PaintBrushIcon weight="bold" />}
        onClick={() => onTabChange("appearance")}
      >
        {copy.appearanceSettings}
      </AppButton>
      <AppButton
        className="settings-tab"
        variant="tab"
        active={activeTab === "system"}
        disabled={isSaving}
        icon={<DesktopIcon weight="bold" />}
        onClick={() => onTabChange("system")}
      >
        {copy.systemSettings}
      </AppButton>
    </div>
  );
}
