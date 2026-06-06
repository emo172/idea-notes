// Idea Notes 设置页签组件。
// 作用：
// 1. 渲染设置中心左侧按功能拆分的页面入口。
// 2. 将页签切换状态通过回调交给 SettingsPanel 维护。
import type { ReactElement } from "react";
import {
  BellIcon,
  DatabaseIcon,
  PaintBrushIcon,
  RocketLaunchIcon,
} from "@phosphor-icons/react";
import { AppButton } from "../ui/AppButton";
import type { SettingsCopy } from "../../i18n";

export type SettingsTab = "interface" | "startup" | "reminders" | "data";

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
  const tabs = [
    {
      id: "interface",
      label: copy.interfaceSettings,
      icon: <PaintBrushIcon weight="bold" />,
    },
    {
      id: "startup",
      label: copy.startupSettings,
      icon: <RocketLaunchIcon weight="bold" />,
    },
    {
      id: "reminders",
      label: copy.reminderSettings,
      icon: <BellIcon weight="bold" />,
    },
    {
      id: "data",
      label: copy.dataSettings,
      icon: <DatabaseIcon weight="bold" />,
    },
  ] satisfies Array<{
    id: SettingsTab;
    label: string;
    icon: ReactElement;
  }>;

  return (
    <div className="settings-sidebar">
      {tabs.map((tab) => (
        <AppButton
          className="settings-tab"
          variant="tab"
          active={activeTab === tab.id}
          disabled={isSaving}
          icon={tab.icon}
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </AppButton>
      ))}
    </div>
  );
}
