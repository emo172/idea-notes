// Idea Notes 本地数据存储模块。
// 作用：
// 1. 将笔记、标签和设置保存到 Electron userData 目录中的 JSON 文件。
// 2. 在数据文件不存在时创建默认数据，保证首次启动有可用状态。
// 3. 使用临时文件加 rename 的方式写入，降低写入中断造成文件损坏的概率。
// 4. 为主进程 IPC handler 提供 readData/saveData 两个持久化入口。
import { app } from "electron";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { defaultSettings, getDefaultData } from "@shared/defaultData";
import { purgeExpiredTrash } from "@shared/noteLogic";
import type { IdeaNotesData } from "@shared/types";

// 数据文件放在 Electron userData 目录，避免写入安装目录或源码目录。
const dataFileName = "idea-notes-data.json";

function dataPath(): string {
  return join(app.getPath("userData"), dataFileName);
}

// 使用临时文件 + rename 的方式写入，降低写入中断导致 JSON 损坏的概率。
async function writeJsonFile(path: string, data: IdeaNotesData): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tempPath = `${path}.tmp`;
  await writeFile(tempPath, JSON.stringify(data, null, 2), "utf8");
  await rename(tempPath, path);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeTag(tag: unknown): string | null {
  if (typeof tag === "string") {
    const name = tag.trim();
    return name || null;
  }
  if (isRecord(tag) && typeof tag.name === "string") {
    const name = tag.name.trim();
    return name || null;
  }
  return null;
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const normalized = tags
    .map(normalizeTag)
    .filter((tag): tag is string => tag !== null);
  return [...new Set(normalized)];
}

function normalizeData(data: IdeaNotesData): IdeaNotesData {
  return {
    ...data,
    tags: normalizeTags(data.tags),
    notes: data.notes.map((note) => ({
      ...note,
      tags: normalizeTags(note.tags),
    })),
    settings: {
      ...defaultSettings,
      ...data.settings,
    },
  };
}

export async function readData(): Promise<IdeaNotesData> {
  const path = dataPath();
  try {
    const storedData = JSON.parse(
      await readFile(path, "utf8"),
    ) as IdeaNotesData;
    const normalizedData = normalizeData(storedData);
    const cleanedData = purgeExpiredTrash(normalizedData);
    if (JSON.stringify(cleanedData) !== JSON.stringify(storedData)) {
      try {
        await writeJsonFile(path, cleanedData);
      } catch {
        // 读取路径不因迁移或清理写回失败阻断有效数据；下次启动可再次尝试写回。
      }
    }
    return cleanedData;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    // 只有文件不存在时才创建默认数据；其它读写或解析错误交给上层暴露，避免静默吞数据。
    if (code !== "ENOENT") throw error;
    const initialData = getDefaultData();
    await writeJsonFile(path, initialData);
    return initialData;
  }
}

export async function saveData(data: IdeaNotesData): Promise<IdeaNotesData> {
  // 返回写入后的数据，方便 IPC handler 直接回传给 renderer 更新本地状态。
  const cleanedData = purgeExpiredTrash(data);
  await writeJsonFile(dataPath(), cleanedData);
  return cleanedData;
}
