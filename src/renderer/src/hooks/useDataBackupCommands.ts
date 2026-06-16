// 数据备份命令 hook。
// 作用：
// 1. 管理数据导出、导入确认模式和导入导出反馈。
// 2. 让 App 主组件只负责接线，不直接编排备份文件 API 调用细节。
import { useState } from "react";
import type { AppLanguage, IdeaNotesData, ImportDataMode } from "@shared/types";
import { appCopy, settingsCopy } from "../i18n";

type RunSavingTask = (
  errorTarget: "main",
  task: () => Promise<void>,
) => Promise<boolean>;

interface UseDataBackupCommandsInput {
  currentLanguage: AppLanguage;
  replaceData: (nextData: IdeaNotesData) => void;
  runSavingTask: RunSavingTask;
}

interface UseDataBackupCommandsResult {
  backupFeedback: string | null;
  importConfirmMode: ImportDataMode | null;
  setImportConfirmMode: (mode: ImportDataMode | null) => void;
  clearBackupFeedback: () => void;
  handleExportData: () => Promise<void>;
  handleConfirmImportData: () => Promise<void>;
  handleExportNoteMarkdown: (noteId: string) => Promise<void>;
  handleExportVisibleMarkdown: (noteIds: string[]) => Promise<void>;
  handleImportMarkdownFiles: () => Promise<void>;
  handleImportDroppedMarkdownFiles: (filePaths: string[]) => Promise<void>;
}

export function useDataBackupCommands({
  currentLanguage,
  replaceData,
  runSavingTask,
}: UseDataBackupCommandsInput): UseDataBackupCommandsResult {
  const [backupFeedback, setBackupFeedback] = useState<string | null>(null);
  const [importConfirmMode, setImportConfirmMode] = useState<ImportDataMode | null>(
    null,
  );
  const currentSettingsCopy = settingsCopy[currentLanguage];
  const currentAppCopy = appCopy[currentLanguage];

  function clearBackupFeedback(): void {
    setBackupFeedback(null);
  }

  async function handleExportData(): Promise<void> {
    setBackupFeedback(null);
    await runSavingTask("main", async () => {
      const result = await window.ideaNotes.exportData();
      if (result.ok) {
        setBackupFeedback(currentSettingsCopy.exportSuccess);
        return;
      }
      if (result.reason !== "cancelled") {
        setBackupFeedback(currentSettingsCopy.exportFailed);
      }
    });
  }

  async function handleConfirmImportData(): Promise<void> {
    if (!importConfirmMode) return;
    setBackupFeedback(null);
    const mode = importConfirmMode;
    const didImport = await runSavingTask("main", async () => {
      const result = await window.ideaNotes.importData(mode);
      if (result.ok && result.data) {
        replaceData(result.data);
        setBackupFeedback(settingsCopy[result.data.settings.language].importSuccess);
        return;
      }
      if (result.reason !== "cancelled") {
        setBackupFeedback(currentSettingsCopy.importFailed);
      }
    });
    if (didImport) setImportConfirmMode(null);
  }

  function setMarkdownImportFeedback(result: {
    ok: boolean;
    skippedFiles?: string[];
  }): void {
    if (!result.ok) {
      setBackupFeedback(currentAppCopy.markdownImportFailed);
      return;
    }
    setBackupFeedback(
      result.skippedFiles && result.skippedFiles.length > 0
        ? currentAppCopy.markdownImportPartialSuccess
        : currentAppCopy.markdownImportSuccess,
    );
  }

  async function handleExportNoteMarkdown(noteId: string): Promise<void> {
    setBackupFeedback(null);
    await runSavingTask("main", async () => {
      const result = await window.ideaNotes.exportNoteMarkdown(noteId);
      if (result.ok) {
        setBackupFeedback(currentAppCopy.markdownExportSuccess);
        return;
      }
      if (result.reason !== "cancelled") {
        setBackupFeedback(currentAppCopy.markdownExportFailed);
      }
    });
  }

  async function handleExportVisibleMarkdown(noteIds: string[]): Promise<void> {
    if (noteIds.length === 0) {
      setBackupFeedback(currentAppCopy.markdownExportFailed);
      return;
    }
    setBackupFeedback(null);
    await runSavingTask("main", async () => {
      const result = await window.ideaNotes.exportNotesMarkdown(noteIds);
      if (result.ok) {
        setBackupFeedback(currentAppCopy.markdownExportSuccess);
        return;
      }
      if (result.reason !== "cancelled") {
        setBackupFeedback(currentAppCopy.markdownExportFailed);
      }
    });
  }

  async function handleImportMarkdownFiles(): Promise<void> {
    setBackupFeedback(null);
    await runSavingTask("main", async () => {
      const result = await window.ideaNotes.importMarkdownFiles(
        currentAppCopy.unnamedNote,
      );
      if (result.ok && result.data) replaceData(result.data);
      if (result.reason !== "cancelled") setMarkdownImportFeedback(result);
    });
  }

  async function handleImportDroppedMarkdownFiles(filePaths: string[]): Promise<void> {
    setBackupFeedback(null);
    await runSavingTask("main", async () => {
      const result = await window.ideaNotes.importDroppedMarkdownFiles(
        filePaths,
        currentAppCopy.unnamedNote,
      );
      if (result.ok && result.data) replaceData(result.data);
      setMarkdownImportFeedback(result);
    });
  }

  return {
    backupFeedback,
    importConfirmMode,
    setImportConfirmMode,
    clearBackupFeedback,
    handleExportData,
    handleConfirmImportData,
    handleExportNoteMarkdown,
    handleExportVisibleMarkdown,
    handleImportMarkdownFiles,
    handleImportDroppedMarkdownFiles,
  };
}
