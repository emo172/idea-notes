// Electron 主进程本地存储测试。
// 作用：
// 1. 用临时 userData 目录验证首次读取会创建默认数据文件。
// 2. 验证保存数据会写入稳定 JSON，并清理临时写入文件。
// 3. 验证损坏 JSON 不会被默认数据静默覆盖，避免吞掉用户数据问题。
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";

const electronMock = vi.hoisted(() => ({
  getPath: vi.fn<() => string>(),
}));

vi.mock("electron", () => ({
  app: {
    getPath: electronMock.getPath,
  },
}));

const dataFileName = "idea-notes-data.json";
let userDataDir = "";

async function importStore(): Promise<typeof import("../../src/main/store")> {
  vi.resetModules();
  return import("../../src/main/store");
}

describe("主进程本地存储", () => {
  beforeEach(async () => {
    userDataDir = await mkdtemp(join(tmpdir(), "idea-notes-store-"));
    electronMock.getPath.mockReturnValue(userDataDir);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    if (userDataDir) await rm(userDataDir, { force: true, recursive: true });
  });

  it("首次读取时在 userData 目录创建默认数据文件", async () => {
    const { readData } = await importStore();

    const data = await readData();
    const persisted = JSON.parse(
      await readFile(join(userDataDir, dataFileName), "utf8"),
    );

    expect(electronMock.getPath).toHaveBeenCalledWith("userData");
    expect(data.settings.language).toBe("zh-CN");
    expect(data.notes.map((note) => note.id)).toContain("seed-navigation");
    expect(persisted).toEqual(data);
  });

  it("保存数据时写入 JSON 并返回同一个数据对象", async () => {
    const { saveData } = await importStore();
    const data = {
      ...getDefaultData(Date.parse("2026-05-29T08:00:00.000Z")),
      tags: ["项目", "阅读"],
    };

    const result = await saveData(data);
    const rawJson = await readFile(join(userDataDir, dataFileName), "utf8");

    expect(result).toBe(data);
    expect(JSON.parse(rawJson)).toEqual(data);
    await expect(
      readFile(join(userDataDir, `${dataFileName}.tmp`), "utf8"),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("读取损坏 JSON 时抛出错误且不覆盖原文件", async () => {
    const brokenJson = "{ not valid json";
    await writeFile(join(userDataDir, dataFileName), brokenJson, "utf8");
    const { readData } = await importStore();

    await expect(readData()).rejects.toThrow();
    await expect(
      readFile(join(userDataDir, dataFileName), "utf8"),
    ).resolves.toBe(brokenJson);
  });
});
