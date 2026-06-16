// 主进程 Markdown 文件导入导出模块。
// 作用：
// 1. 通过系统对话框导出单条或多条笔记为 Markdown 文件。
// 2. 从系统对话框或拖放路径批量导入 Markdown 文件为新笔记。
// 3. 汇总成功数量和跳过文件，避免部分失败破坏现有数据。
import type { BrowserWindow, OpenDialogOptions, SaveDialogOptions } from "electron";
import { dialog } from "electron";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import {
  buildChecklistItems,
  buildMarkdownExportFileName,
  createNextTag,
  createNote,
  isMarkdownFilePath,
  parseMarkdownNoteDraft,
  serializeNoteToMarkdown,
} from "@shared/noteLogic";
import type {
  IdeaNote,
  IdeaNotesData,
  IdeaTag,
  MarkdownFileResult,
  MarkdownImportResult,
} from "@shared/types";
import { readData, saveData } from "../store";

function showSaveMarkdownDialog(
  window: BrowserWindow | null,
  options: SaveDialogOptions,
): Promise<Electron.SaveDialogReturnValue> {
  return window
    ? dialog.showSaveDialog(window, options)
    : dialog.showSaveDialog(options);
}

function showOpenMarkdownDialog(
  window: BrowserWindow | null,
  options: OpenDialogOptions,
): Promise<Electron.OpenDialogReturnValue> {
  return window
    ? dialog.showOpenDialog(window, options)
    : dialog.showOpenDialog(options);
}

export async function exportNoteMarkdownFile(
  window: BrowserWindow | null,
  noteId: string,
): Promise<MarkdownFileResult> {
  try {
    const data = await readData();
    const note = data.notes.find((item) => item.id === noteId);
    if (!note) return { ok: false, reason: "invalid", exportedCount: 0 };
    const options: SaveDialogOptions = {
      title: "导出 Markdown 笔记",
      defaultPath: buildMarkdownExportFileName(note.title, "未命名笔记"),
      filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
    };
    const { canceled, filePath } = await showSaveMarkdownDialog(window, options);
    if (canceled || !filePath) return { ok: false, reason: "cancelled" };
    await writeFile(filePath, serializeNoteToMarkdown(note), "utf8");
    return { ok: true, filePath, exportedCount: 1 };
  } catch {
    return { ok: false, reason: "failed", exportedCount: 0 };
  }
}

export async function exportNotesMarkdownFiles(
  window: BrowserWindow | null,
  noteIds: string[],
): Promise<MarkdownFileResult> {
  try {
    if (noteIds.length === 0) return { ok: false, reason: "invalid", exportedCount: 0 };
    const data = await readData();
    const noteIdSet = new Set(noteIds);
    const noteById = new Map(data.notes.map((note) => [note.id, note]));
    const notes = [...noteIdSet]
      .map((noteId) => noteById.get(noteId))
      .filter((note): note is IdeaNote => Boolean(note));
    if (notes.length === 0) return { ok: false, reason: "invalid", exportedCount: 0 };
    const options: OpenDialogOptions = {
      title: "导出 Markdown 笔记到文件夹",
      properties: ["openDirectory", "createDirectory"],
    };
    const { canceled, filePaths } = await showOpenMarkdownDialog(window, options);
    const directory = filePaths[0];
    if (canceled || !directory) return { ok: false, reason: "cancelled" };
    await mkdir(directory, { recursive: true });
    const usedFileNames = new Set(await readdir(directory));
    for (const note of notes) {
      const fileName = buildUniqueMarkdownFileName(note, usedFileNames);
      await writeFile(join(directory, fileName), serializeNoteToMarkdown(note), "utf8");
    }
    return { ok: true, filePath: directory, exportedCount: notes.length };
  } catch {
    return { ok: false, reason: "failed", exportedCount: 0 };
  }
}

export async function importMarkdownFilesFromDialog(
  window: BrowserWindow | null,
  fallbackTitle: string,
): Promise<MarkdownImportResult> {
  try {
    const options: OpenDialogOptions = {
      title: "导入 Markdown 笔记",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
    };
    const { canceled, filePaths } = await showOpenMarkdownDialog(window, options);
    if (canceled || filePaths.length === 0) return { ok: false, reason: "cancelled" };
    return importMarkdownFilePaths(filePaths, fallbackTitle);
  } catch {
    return { ok: false, reason: "failed", importedCount: 0 };
  }
}

export async function importDroppedMarkdownFiles(
  filePaths: string[],
  fallbackTitle: string,
): Promise<MarkdownImportResult> {
  try {
    return importMarkdownFilePaths(filePaths, fallbackTitle);
  } catch {
    return { ok: false, reason: "failed", importedCount: 0 };
  }
}

async function importMarkdownFilePaths(
  filePaths: string[],
  fallbackTitle: string,
): Promise<MarkdownImportResult> {
  const skippedFiles = filePaths.filter((filePath) => !isMarkdownFilePath(filePath));
  const markdownPaths = filePaths.filter(isMarkdownFilePath);
  if (markdownPaths.length === 0) {
    return { ok: false, reason: "invalid", importedCount: 0, skippedFiles };
  }
  const importedNotes: IdeaNote[] = [];
  const readFailures: string[] = [];
  for (const filePath of markdownPaths) {
    try {
      const markdown = await readFile(filePath, "utf8");
      const parsed = parseMarkdownNoteDraft({
        fileName: basename(filePath),
        markdown,
        fallbackTitle,
      });
      const note = createNote(parsed);
      importedNotes.push({
        ...note,
        checklist: buildChecklistItems(parsed.body, note.id, (_text, index) =>
          Boolean(parsed.checkedStates[index]),
        ),
      });
    } catch {
      readFailures.push(filePath);
    }
  }
  if (importedNotes.length === 0) {
    return {
      ok: false,
      reason: "invalid",
      importedCount: 0,
      skippedFiles: [...skippedFiles, ...readFailures],
    };
  }
  const localData = await readData();
  const tags = mergeImportedTags(localData.tags, importedNotes);
  const nextData: IdeaNotesData = {
    ...localData,
    tags,
    notes: [...importedNotes, ...localData.notes],
  };
  const savedData = await saveData(nextData);
  return {
    ok: true,
    importedCount: importedNotes.length,
    skippedFiles: [...skippedFiles, ...readFailures],
    data: savedData,
  };
}

function mergeImportedTags(localTags: IdeaTag[], notes: IdeaNote[]): IdeaTag[] {
  const nextTags = [...localTags];
  const knownNames = new Set(nextTags.map((tag) => tag.name));
  for (const note of notes) {
    for (const tagName of note.tags) {
      if (knownNames.has(tagName)) continue;
      nextTags.push(createNextTag(tagName, nextTags));
      knownNames.add(tagName);
    }
  }
  return nextTags;
}

function buildUniqueMarkdownFileName(
  note: IdeaNote,
  usedFileNames: Set<string>,
): string {
  const baseName = buildMarkdownExportFileName(note.title, "未命名笔记").replace(
    /\.md$/,
    "",
  );
  let fileName = `${baseName}.md`;
  let sequence = 2;
  while (usedFileNames.has(fileName)) {
    fileName = `${baseName}-${sequence}.md`;
    sequence += 1;
  }
  usedFileNames.add(fileName);
  return fileName;
}
