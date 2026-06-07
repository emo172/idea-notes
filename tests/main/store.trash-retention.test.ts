// 主进程 store 回收站保留策略测试。
// 作用：
// 1. 验证读取和保存时会清理过期回收站笔记。
// 2. 验证读取时清理写回失败不会阻断有效数据加载。
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import type { IdeaNotesData } from "@shared/types";
import {
  baseTime,
  dataFileName,
  dataWithTrashRetention,
  importStore,
  setupStoreTest,
} from "./helpers/storeTestUtils";

describe("主进程本地存储回收站保留策略", () => {
  const storeTest = setupStoreTest();

  it("读取数据时清理过期回收站笔记并写回磁盘", async () => {
    vi.spyOn(Date, "now").mockReturnValue(baseTime);
    const storedData = dataWithTrashRetention(baseTime);
    await writeFile(
      storeTest.dataFilePath(),
      JSON.stringify(storedData, null, 2),
      "utf8",
    );
    const { readData } = await importStore();

    const data = await readData();
    const persisted = JSON.parse(
      await readFile(storeTest.dataFilePath(), "utf8"),
    ) as IdeaNotesData;

    expect(data.notes.map((note) => note.id)).toContain("fresh-trash");
    expect(data.notes.map((note) => note.id)).not.toContain("expired-trash");
    expect(persisted).toEqual(data);
  });

  it("读取有效数据时不因清理写回失败阻断加载", async () => {
    vi.spyOn(Date, "now").mockReturnValue(baseTime);
    const storedData = dataWithTrashRetention(baseTime);
    await writeFile(
      storeTest.dataFilePath(),
      JSON.stringify(storedData, null, 2),
      "utf8",
    );
    await mkdir(storeTest.dataFilePath(`${dataFileName}.tmp`));
    const { readData } = await importStore();

    const data = await readData();
    const persisted = JSON.parse(
      await readFile(storeTest.dataFilePath(), "utf8"),
    ) as IdeaNotesData;

    expect(data.notes.map((note) => note.id)).toContain("fresh-trash");
    expect(data.notes.map((note) => note.id)).not.toContain("expired-trash");
    expect(persisted).toEqual(storedData);
  });

  it("保存数据时清理过期回收站笔记并返回清理后的数据", async () => {
    vi.spyOn(Date, "now").mockReturnValue(baseTime);
    const { saveData } = await importStore();
    const data = dataWithTrashRetention(baseTime);

    const result = await saveData(data);
    const persisted = JSON.parse(
      await readFile(storeTest.dataFilePath(), "utf8"),
    ) as IdeaNotesData;

    expect(result).not.toBe(data);
    expect(result.notes.map((note) => note.id)).toContain("fresh-trash");
    expect(result.notes.map((note) => note.id)).not.toContain("expired-trash");
    expect(persisted).toEqual(result);
  });
});
