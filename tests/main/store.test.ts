// Electron 主进程本地存储测试。
// 作用：
// 1. 用临时 userData 目录验证首次读取会创建默认数据文件。
// 2. 验证保存数据会写入稳定 JSON，并清理临时写入文件。
// 3. 验证损坏 JSON 不会被默认数据静默覆盖，避免吞掉用户数据问题。
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import type { IdeaNotesData } from "@shared/types";

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
const baseTime = Date.parse("2026-05-29T08:00:00.000Z");

function dataWithTrashRetention(now: number): IdeaNotesData {
  const data = getDefaultData(now);
  return {
    ...data,
    settings: { ...data.settings, trashAutoDelete: "7" },
    notes: [
      ...data.notes,
      {
        ...data.notes[0],
        id: "fresh-trash",
        title: "未过期回收站笔记",
        status: "trash",
        trashedAt: now - 6 * 86_400_000,
      },
      {
        ...data.notes[0],
        id: "expired-trash",
        title: "过期回收站笔记",
        status: "trash",
        trashedAt: now - 7 * 86_400_000,
      },
    ],
  };
}

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

  it("读取数据时清理过期回收站笔记并写回磁盘", async () => {
    vi.spyOn(Date, "now").mockReturnValue(baseTime);
    const storedData = dataWithTrashRetention(baseTime);
    await writeFile(
      join(userDataDir, dataFileName),
      JSON.stringify(storedData, null, 2),
      "utf8",
    );
    const { readData } = await importStore();

    const data = await readData();
    const persisted = JSON.parse(
      await readFile(join(userDataDir, dataFileName), "utf8"),
    ) as IdeaNotesData;

    expect(data.notes.map((note) => note.id)).toContain("fresh-trash");
    expect(data.notes.map((note) => note.id)).not.toContain("expired-trash");
    expect(persisted).toEqual(data);
  });

  it("读取有效数据时不因清理写回失败阻断加载", async () => {
    vi.spyOn(Date, "now").mockReturnValue(baseTime);
    const storedData = dataWithTrashRetention(baseTime);
    await writeFile(
      join(userDataDir, dataFileName),
      JSON.stringify(storedData, null, 2),
      "utf8",
    );
    await mkdir(join(userDataDir, `${dataFileName}.tmp`));
    const { readData } = await importStore();

    const data = await readData();
    const persisted = JSON.parse(
      await readFile(join(userDataDir, dataFileName), "utf8"),
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
      await readFile(join(userDataDir, dataFileName), "utf8"),
    ) as IdeaNotesData;

    expect(result).not.toBe(data);
    expect(result.notes.map((note) => note.id)).toContain("fresh-trash");
    expect(result.notes.map((note) => note.id)).not.toContain("expired-trash");
    expect(persisted).toEqual(result);
  });

  it("读取损坏 JSON 时抛出错误且不覆盖原文件", async () => {
    const brokenJson = "{ not valid json";
    await writeFile(join(userDataDir, dataFileName), brokenJson, "utf8");
    const { readData } = await importStore();

    await expect(readData()).rejects.toThrow();
    await expect(readFile(join(userDataDir, dataFileName), "utf8")).resolves.toBe(
      brokenJson,
    );
  });

  it("读取旧标签对象数据时迁移为字符串标签并补齐设置", async () => {
    const defaultData = getDefaultData(Date.parse("2026-05-29T08:00:00.000Z"));
    const legacyData = {
      ...defaultData,
      tags: [
        { name: "工作", color: "#2563eb", group: "默认" },
        { name: "灵感", color: "#7c3aed", group: "默认" },
      ],
      notes: defaultData.notes.map((note) =>
        note.id === "seed-navigation"
          ? {
              ...note,
              tags: [{ name: "工作", color: "#2563eb", group: "默认" }, "待办"],
            }
          : note,
      ),
      settings: {
        themeMode: "light",
        startup: false,
        trashAutoDelete: "never",
        language: "zh-CN",
      },
    };
    await writeFile(
      join(userDataDir, dataFileName),
      JSON.stringify(legacyData, null, 2),
      "utf8",
    );
    const { readData } = await importStore();

    const data = await readData();
    const persisted = JSON.parse(
      await readFile(join(userDataDir, dataFileName), "utf8"),
    );

    expect(data.tags).toEqual(["工作", "灵感"]);
    expect(data.notes[0].tags).toEqual(["工作", "待办"]);
    expect(data.settings).not.toHaveProperty("backgroundColor");
    expect(persisted).toEqual(data);
  });

  it("读取旧背景颜色设置时清理该字段并写回磁盘", async () => {
    const defaultData = getDefaultData(Date.parse("2026-05-29T08:00:00.000Z"));
    const legacyData = {
      ...defaultData,
      settings: {
        ...defaultData.settings,
        backgroundColor: "#102030",
      },
    };
    await writeFile(
      join(userDataDir, dataFileName),
      JSON.stringify(legacyData, null, 2),
      "utf8",
    );
    const { readData } = await importStore();

    const data = await readData();
    const persisted = JSON.parse(
      await readFile(join(userDataDir, dataFileName), "utf8"),
    );

    expect(data.settings).not.toHaveProperty("backgroundColor");
    expect(persisted.settings).not.toHaveProperty("backgroundColor");
    expect(persisted).toEqual(data);
  });

  it("读取非法设置值时回退到默认设置并保留其它旧字段", async () => {
    const defaultData = getDefaultData(Date.parse("2026-05-29T08:00:00.000Z"));
    const legacyData = {
      ...defaultData,
      settings: {
        themeMode: "sepia",
        startup: "yes",
        trashAutoDelete: "invalid",
        language: "fr",
        legacySetting: "保留旧字段",
      },
    };
    await writeFile(
      join(userDataDir, dataFileName),
      JSON.stringify(legacyData, null, 2),
      "utf8",
    );
    const { readData } = await importStore();

    const data = await readData();
    const persisted = JSON.parse(
      await readFile(join(userDataDir, dataFileName), "utf8"),
    );

    expect(data.settings).toEqual({
      ...defaultData.settings,
      legacySetting: "保留旧字段",
    });
    expect(persisted.settings).toEqual(data.settings);
  });
});
