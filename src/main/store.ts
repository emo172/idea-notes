// Idea Notes 本地数据存储模块。
// 作用：
// 1. 将笔记、标签和设置保存到 Electron userData 目录中的 JSON 文件。
// 2. 在数据文件不存在时创建默认数据，保证首次启动有可用状态。
// 3. 使用临时文件加 rename 的方式写入，降低写入中断造成文件损坏的概率。
// 4. 为主进程 IPC handler 提供 readData/saveData 两个持久化入口。
import { app } from "electron";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getDefaultData } from "@shared/defaultData";
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

export async function readData(): Promise<IdeaNotesData> {
  const path = dataPath();
  try {
    const data = JSON.parse(await readFile(path, "utf8")) as IdeaNotesData;
    const cleanedData = purgeExpiredTrash(data);
    if (cleanedData !== data) await writeJsonFile(path, cleanedData);
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
