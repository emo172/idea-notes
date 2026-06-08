// 主进程 store 旧数据迁移测试。
// 作用：
// 1. 验证旧标签、旧设置和旧回收站字段会归一化并写回。
// 2. 验证 previousStatus 的持久化校验契约。
import { readFile, writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import { validateIdeaNotesData } from "@shared/ideaNotesDataValidation";
import type { IdeaNotesData } from "@shared/types";
import { baseTime, importStore, setupStoreTest } from "./helpers/storeTestUtils";

describe("主进程本地存储迁移", () => {
  const storeTest = setupStoreTest();

  it("读取旧字符串标签数据时迁移为带颜色的标签对象并补齐设置", async () => {
    const defaultData = getDefaultData(Date.parse("2026-05-29T08:00:00.000Z"));
    const legacyData = {
      ...defaultData,
      tags: [
        { name: "工作", color: "not-a-color", group: "默认" },
        "灵感",
        { name: "工作", color: "#10b981" },
        "待办",
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
      storeTest.dataFilePath(),
      JSON.stringify(legacyData, null, 2),
      "utf8",
    );
    const { readData } = await importStore();

    const data = await readData();
    const persisted = JSON.parse(await readFile(storeTest.dataFilePath(), "utf8"));

    expect(data.tags).toEqual([
      { id: "tag-1", name: "工作", color: "#2563eb" },
      { id: "tag-2", name: "灵感", color: "#7c3aed" },
      { id: "tag-3", name: "待办", color: "#f97316" },
    ]);
    expect(data.tags.find((tag) => tag.name === "工作")?.color).toBe("#2563eb");
    expect(data.notes[0].tags).toEqual(["工作", "待办"]);
    expect(data.settings).not.toHaveProperty("backgroundColor");
    expect(data.settings.silentStart).toBe(false);
    expect(data.settings.minimizeToTrayOnClose).toBe(false);
    expect(data.settings.appWindowControls).toBe(true);
    expect(persisted).toEqual(data);
  });

  it("读取混合旧标签数据时为迁移标签生成不碰撞的 ID", async () => {
    const defaultData = getDefaultData(Date.parse("2026-05-29T08:00:00.000Z"));
    const legacyData = {
      ...defaultData,
      tags: [
        { id: "tag-2", name: "工作", color: "#2563eb" },
        "灵感",
        { id: "tag-2", name: "待办", color: "#f97316" },
      ],
    };
    await writeFile(
      storeTest.dataFilePath(),
      JSON.stringify(legacyData, null, 2),
      "utf8",
    );
    const { readData } = await importStore();

    const data = await readData();

    expect(data.tags).toEqual([
      { id: "tag-2", name: "工作", color: "#2563eb" },
      { id: "tag-3", name: "灵感", color: "#7c3aed" },
      { id: "tag-4", name: "待办", color: "#f97316" },
    ]);
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
      storeTest.dataFilePath(),
      JSON.stringify(legacyData, null, 2),
      "utf8",
    );
    const { readData } = await importStore();

    const data = await readData();
    const persisted = JSON.parse(await readFile(storeTest.dataFilePath(), "utf8"));

    expect(data.settings).not.toHaveProperty("backgroundColor");
    expect(persisted.settings).not.toHaveProperty("backgroundColor");
    expect(persisted).toEqual(data);
  });

  it("读取旧回收站数据时只为回收站笔记保留合法删除前状态", async () => {
    const defaultData = getDefaultData(Date.parse("2026-05-29T08:00:00.000Z"));
    const legacyData = {
      ...defaultData,
      notes: [
        {
          ...defaultData.notes[0],
          id: "trash-completed",
          status: "trash",
          trashedAt: baseTime,
          previousStatus: "completed",
        },
        {
          ...defaultData.notes[0],
          id: "trash-invalid",
          status: "trash",
          trashedAt: baseTime,
          previousStatus: "deleted",
        },
        {
          ...defaultData.notes[0],
          id: "active-with-previous",
          status: "active",
          previousStatus: "completed",
        },
      ],
    };
    await writeFile(
      storeTest.dataFilePath(),
      JSON.stringify(legacyData, null, 2),
      "utf8",
    );
    const { readData } = await importStore();

    const data = await readData();
    const persisted = JSON.parse(
      await readFile(storeTest.dataFilePath(), "utf8"),
    ) as IdeaNotesData;
    const trashCompleted = data.notes.find((note) => note.id === "trash-completed");
    const trashInvalid = data.notes.find((note) => note.id === "trash-invalid");
    const activeWithPrevious = data.notes.find(
      (note) => note.id === "active-with-previous",
    );

    expect(trashCompleted?.previousStatus).toBe("completed");
    expect(trashInvalid).not.toHaveProperty("previousStatus");
    expect(activeWithPrevious).not.toHaveProperty("previousStatus");
    expect(persisted).toEqual(data);
  });

  it("校验 previousStatus 只接受非回收站状态值", () => {
    const data = getDefaultData(Date.parse("2026-05-29T08:00:00.000Z"));

    expect(
      validateIdeaNotesData({
        ...data,
        notes: [
          {
            ...data.notes[0],
            status: "trash",
            trashedAt: baseTime,
            previousStatus: "completed",
          },
        ],
      }),
    ).toBe(true);
    expect(
      validateIdeaNotesData({
        ...data,
        notes: [
          {
            ...data.notes[0],
            status: "trash",
            trashedAt: baseTime,
            previousStatus: "trash",
          },
        ],
      }),
    ).toBe(false);
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
      storeTest.dataFilePath(),
      JSON.stringify(legacyData, null, 2),
      "utf8",
    );
    const { readData } = await importStore();

    const data = await readData();
    const persisted = JSON.parse(await readFile(storeTest.dataFilePath(), "utf8"));

    expect(data.settings).toEqual({
      ...defaultData.settings,
      legacySetting: "保留旧字段",
    });
    expect(persisted.settings).toEqual(data.settings);
  });
});
