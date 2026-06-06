// 主进程数据备份导入导出模块。
// 作用：
// 1. 通过系统文件对话框导出当前 IdeaNotesData JSON。
// 2. 读取用户选择的 JSON，校验并归一化后按覆盖或合并模式写入本地数据。
// 3. 把取消、非法文件和写入失败显式返回给 renderer，避免导入失败时破坏现有数据。
import type { BrowserWindow, OpenDialogOptions, SaveDialogOptions } from "electron";
import { dialog } from "electron";
import { readFile } from "node:fs/promises";
import { writeJsonFile } from "./writeJsonFile";
import { readData, saveData } from "../store";
import { normalizeData } from "./normalizeData";
import { validateIdeaNotesData } from "@shared/ideaNotesDataValidation";
import { ensureUniqueTagId } from "@shared/noteLogic";
import type { DataFileResult, IdeaNotesData, ImportDataMode } from "@shared/types";

type ImportDataResult = DataFileResult & { data?: IdeaNotesData };

function defaultExportFileName(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `idea-notes-backup-${date}.json`;
}

function mergeData(
  localData: IdeaNotesData,
  importedData: IdeaNotesData,
): IdeaNotesData {
  const localNoteIds = new Set(localData.notes.map((note) => note.id));
  const localTagNames = new Set(localData.tags.map((tag) => tag.name));
  const importedNewNotes = importedData.notes.filter(
    (note) => !localNoteIds.has(note.id),
  );
  const importedNewTags = importedData.tags.filter(
    (tag) => !localTagNames.has(tag.name),
  );
  const mergedTags = [...localData.tags];
  for (const tag of importedNewTags) {
    mergedTags.push(ensureUniqueTagId(tag, mergedTags));
  }

  return {
    notes: [...localData.notes, ...importedNewNotes],
    tags: mergedTags,
    settings: localData.settings,
  };
}

async function readImportFile(filePath: string): Promise<IdeaNotesData | null> {
  try {
    const parsedData = JSON.parse(await readFile(filePath, "utf8")) as unknown;
    const normalizedData = normalizeData(parsedData as IdeaNotesData);
    if (!validateIdeaNotesData(normalizedData)) return null;
    return normalizedData;
  } catch {
    return null;
  }
}

export async function exportDataFile(
  window: BrowserWindow | null,
): Promise<DataFileResult> {
  try {
    const options: SaveDialogOptions = {
      title: "导出灵感笔记数据",
      defaultPath: defaultExportFileName(),
      filters: [{ name: "JSON", extensions: ["json"] }],
    };
    const { canceled, filePath } = window
      ? await dialog.showSaveDialog(window, options)
      : await dialog.showSaveDialog(options);
    if (canceled || !filePath) return { ok: false, reason: "cancelled" };

    await writeJsonFile(filePath, await readData());
    return { ok: true, filePath };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

export async function importDataFile(
  window: BrowserWindow | null,
  mode: ImportDataMode,
): Promise<ImportDataResult> {
  try {
    const options: OpenDialogOptions = {
      title: "导入灵感笔记数据",
      properties: ["openFile"],
      filters: [{ name: "JSON", extensions: ["json"] }],
    };
    const { canceled, filePaths } = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options);
    const filePath = filePaths[0];
    if (canceled || !filePath) return { ok: false, reason: "cancelled" };

    const importedData = await readImportFile(filePath);
    if (!importedData) return { ok: false, filePath, reason: "invalid" };

    const dataToSave =
      mode === "overwrite" ? importedData : mergeData(await readData(), importedData);
    const savedData = await saveData(dataToSave);
    return { ok: true, filePath, data: savedData };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
