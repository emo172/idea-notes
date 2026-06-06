// JSON 文件安全写入工具。
// 作用：
// 1. 写入前确保父目录存在。
// 2. 使用临时文件 + rename 降低中断导致 JSON 损坏的风险。
import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { IdeaNotesData } from "@shared/types";

export async function writeJsonFile(path: string, data: IdeaNotesData): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tempPath = `${path}.tmp`;
  await writeFile(tempPath, JSON.stringify(data, null, 2), "utf8");
  await rename(tempPath, path);
}
