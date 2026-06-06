// Idea Notes 数据管理设置页面。
// 作用：
// 1. 渲染回收站保留、数据导出和数据导入入口。
// 2. 将导入导出命令交给 App 统一处理确认弹窗和桌面文件能力。
import type { ReactElement } from "react";
import {
  DownloadSimpleIcon,
  GitMergeIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
import type { IdeaNotesData, ImportDataMode, TrashRetention } from "@shared/types";
import type { SettingsCopy } from "../../i18n";
import { AppButton } from "../ui/AppButton";

interface DataSettingsProps {
  copy: SettingsCopy;
  isSaving: boolean;
  settings: IdeaNotesData["settings"];
  backupFeedback: string | null;
  onSettingsChange: (settings: Partial<IdeaNotesData["settings"]>) => Promise<void>;
  onExportData: () => Promise<void>;
  onRequestImportData: (mode: ImportDataMode) => void;
}

export function DataSettings({
  copy,
  isSaving,
  settings,
  backupFeedback,
  onSettingsChange,
  onExportData,
  onRequestImportData,
}: DataSettingsProps): ReactElement {
  return (
    <section className="settings-card">
      <h3>{copy.dataSettings}</h3>
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
      <div className="setting-row settings-backup-row">
        <span className="setting-copy">
          <span>{copy.dataBackup}</span>
          <small>{copy.dataBackupDescription}</small>
        </span>
        <div className="settings-backup-actions">
          <AppButton
            disabled={isSaving}
            icon={<DownloadSimpleIcon weight="bold" />}
            onClick={onExportData}
          >
            {copy.exportData}
          </AppButton>
          <AppButton
            disabled={isSaving}
            icon={<UploadSimpleIcon weight="bold" />}
            onClick={() => onRequestImportData("overwrite")}
          >
            {copy.importOverwrite}
          </AppButton>
          <AppButton
            disabled={isSaving}
            icon={<GitMergeIcon weight="bold" />}
            onClick={() => onRequestImportData("merge")}
          >
            {copy.importMerge}
          </AppButton>
        </div>
      </div>
      {backupFeedback ? (
        <div className="settings-backup-feedback" role="alert">
          {backupFeedback}
        </div>
      ) : null}
    </section>
  );
}
