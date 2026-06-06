// Idea Notes 提醒设置页面。
// 作用：
// 1. 渲染截止提醒启用状态和提前提醒时间。
// 2. 保持提醒设置写入 IdeaSettings.reminders，不触碰主进程调度实现。
import type { ReactElement } from "react";
import type { IdeaNotesData, ReminderLeadMinutes } from "@shared/types";
import type { SettingsCopy } from "../../i18n";

interface ReminderSettingsProps {
  copy: SettingsCopy;
  isSaving: boolean;
  settings: IdeaNotesData["settings"];
  onSettingsChange: (settings: Partial<IdeaNotesData["settings"]>) => Promise<void>;
}

export function ReminderSettings({
  copy,
  isSaving,
  settings,
  onSettingsChange,
}: ReminderSettingsProps): ReactElement {
  return (
    <section className="settings-card">
      <h3>{copy.reminderSettings}</h3>
      <div className="setting-row">
        <span className="setting-copy">
          <span>{copy.reminders}</span>
          <small>{copy.remindersDescription}</small>
        </span>
        <label className="switch">
          <input
            type="checkbox"
            aria-label={`${copy.reminders} ${copy.remindersDescription}`}
            disabled={isSaving}
            checked={settings.reminders.enabled}
            onChange={(event) =>
              onSettingsChange({
                reminders: {
                  ...settings.reminders,
                  enabled: event.target.checked,
                },
              })
            }
          />
          <span className="switch-slider" aria-hidden="true" />
        </label>
      </div>
      <label className="setting-row">
        <span className="setting-copy">
          <span>{copy.reminderLead}</span>
          <small>{copy.reminderLeadDescription}</small>
        </span>
        <select
          disabled={isSaving}
          value={settings.reminders.leadMinutes}
          onChange={(event) =>
            onSettingsChange({
              reminders: {
                ...settings.reminders,
                leadMinutes: Number(event.target.value) as ReminderLeadMinutes,
              },
            })
          }
        >
          <option value="0">{copy.reminderAtDue}</option>
          <option value="10">{copy.reminderTenMinutes}</option>
          <option value="60">{copy.reminderOneHour}</option>
          <option value="1440">{copy.reminderOneDay}</option>
        </select>
      </label>
    </section>
  );
}
