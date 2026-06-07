// 主进程 store 基础读写测试。
// 作用：
// 1. 验证首次读取会创建默认数据文件。
// 2. 验证保存数据会写入 JSON、清理临时文件，并且损坏 JSON 不会被覆盖。
import { readFile, writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import {
  dataFileName,
  getElectronMock,
  importStore,
  setupStoreTest,
} from "./helpers/storeTestUtils";

describe("主进程本地存储读写", () => {
  const storeTest = setupStoreTest();
  const electronMock = getElectronMock();

  it("首次读取时在 userData 目录创建默认数据文件", async () => {
    const { readData } = await importStore();

    const data = await readData();
    const persisted = JSON.parse(await readFile(storeTest.dataFilePath(), "utf8"));

    expect(electronMock.getPath).toHaveBeenCalledWith("userData");
    expect(data.settings.language).toBe("zh-CN");
    expect(data.notes.map((note) => note.id)).toContain("seed-navigation");
    expect(persisted).toEqual(data);
  });

  it("保存数据时写入 JSON 并返回同一个数据对象", async () => {
    const { saveData } = await importStore();
    const data = {
      ...getDefaultData(Date.parse("2026-05-29T08:00:00.000Z")),
      tags: [
        { id: "tag-project", name: "项目", color: "#2563eb" },
        { id: "tag-reading", name: "阅读", color: "#7c3aed" },
      ],
    };

    const result = await saveData(data);
    const rawJson = await readFile(storeTest.dataFilePath(), "utf8");

    expect(result).toBe(data);
    expect(JSON.parse(rawJson)).toEqual(data);
    await expect(
      readFile(storeTest.dataFilePath(`${dataFileName}.tmp`), "utf8"),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("读取损坏 JSON 时抛出错误且不覆盖原文件", async () => {
    const brokenJson = "{ not valid json";
    await writeFile(storeTest.dataFilePath(), brokenJson, "utf8");
    const { readData } = await importStore();

    await expect(readData()).rejects.toThrow();
    await expect(readFile(storeTest.dataFilePath(), "utf8")).resolves.toBe(brokenJson);
  });
});
