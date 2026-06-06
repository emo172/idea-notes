// 主进程数据备份导入导出测试。
// 作用：
// 1. 用临时目录验证导出文件内容、覆盖导入和合并导入规则。
// 2. 锁定非法 JSON 不会改变现有本地数据的安全边界。
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import type { IdeaNotesData } from "@shared/types";

const electronMock = vi.hoisted(() => ({
  getPath: vi.fn<() => string>(),
  showOpenDialog: vi.fn(),
  showSaveDialog: vi.fn(),
}));

vi.mock("electron", () => ({
  app: {
    getPath: electronMock.getPath,
  },
  dialog: {
    showOpenDialog: electronMock.showOpenDialog,
    showSaveDialog: electronMock.showSaveDialog,
  },
}));

const dataFileName = "idea-notes-data.json";
const baseTime = Date.parse("2026-05-29T08:00:00.000Z");
let userDataDir = "";

async function importBackup(): Promise<typeof import("../../src/main/store/backup")> {
  vi.resetModules();
  return import("../../src/main/store/backup");
}

async function writeStoredData(data: IdeaNotesData): Promise<void> {
  await writeFile(
    join(userDataDir, dataFileName),
    JSON.stringify(data, null, 2),
    "utf8",
  );
}

async function readStoredData(): Promise<IdeaNotesData> {
  return JSON.parse(
    await readFile(join(userDataDir, dataFileName), "utf8"),
  ) as IdeaNotesData;
}

describe("主进程数据备份导入导出", () => {
  beforeEach(async () => {
    userDataDir = await mkdtemp(join(tmpdir(), "idea-notes-backup-"));
    electronMock.getPath.mockReturnValue(userDataDir);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    if (userDataDir) await rm(userDataDir, { force: true, recursive: true });
  });

  it("导出当前数据到用户选择的 JSON 文件", async () => {
    const storedData = getDefaultData(baseTime);
    const exportPath = join(userDataDir, "backup.json");
    await writeStoredData(storedData);
    electronMock.showSaveDialog.mockResolvedValue({
      canceled: false,
      filePath: exportPath,
    });
    const { exportDataFile } = await importBackup();

    const result = await exportDataFile(null);
    const exported = JSON.parse(await readFile(exportPath, "utf8"));

    expect(result).toEqual({ ok: true, filePath: exportPath });
    expect(exported).toEqual(storedData);
  });

  it("覆盖导入合法 JSON 并返回写入后的数据", async () => {
    const localData = getDefaultData(baseTime);
    const importedData = {
      ...getDefaultData(baseTime + 1_000),
      tags: [{ id: "tag-imported", name: "导入", color: "#2563eb" }],
      notes: [
        {
          ...getDefaultData(baseTime + 1_000).notes[0],
          id: "imported-note",
          title: "导入笔记",
          tags: ["导入"],
        },
      ],
    };
    const importPath = join(userDataDir, "import.json");
    await writeStoredData(localData);
    await writeFile(importPath, JSON.stringify(importedData, null, 2), "utf8");
    electronMock.showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: [importPath],
    });
    const { importDataFile } = await importBackup();

    const result = await importDataFile(null, "overwrite");
    const persisted = await readStoredData();

    expect(result).toEqual({
      ok: true,
      filePath: importPath,
      data: importedData,
    });
    expect(persisted).toEqual(importedData);
  });

  it("覆盖导入旧字符串标签 JSON 时先迁移再写入", async () => {
    const localData = getDefaultData(baseTime);
    const legacyImportedData = {
      ...getDefaultData(baseTime + 1_000),
      tags: ["导入", "工作", "导入"],
      notes: [
        {
          ...getDefaultData(baseTime + 1_000).notes[0],
          id: "legacy-imported-note",
          title: "旧格式导入笔记",
          tags: ["导入", "工作"],
        },
      ],
    };
    const importPath = join(userDataDir, "legacy-import.json");
    await writeStoredData(localData);
    await writeFile(importPath, JSON.stringify(legacyImportedData, null, 2), "utf8");
    electronMock.showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: [importPath],
    });
    const { importDataFile } = await importBackup();

    const result = await importDataFile(null, "overwrite");
    const persisted = await readStoredData();

    expect(result.ok).toBe(true);
    expect(result.filePath).toBe(importPath);
    expect(result.data?.tags).toEqual([
      { id: "tag-1", name: "导入", color: "#2563eb" },
      { id: "tag-2", name: "工作", color: "#7c3aed" },
    ]);
    expect(result.data?.notes[0].tags).toEqual(["导入", "工作"]);
    expect(persisted).toEqual(result.data);
  });

  it("合并导入时保留本地设置、按 id 追加新笔记并合并标签", async () => {
    const localData = getDefaultData(baseTime);
    localData.settings.language = "en";
    localData.tags = [
      { id: "tag-work", name: "工作", color: "#2563eb" },
      { id: "tag-local", name: "本地", color: "#7c3aed" },
    ];
    const importedData = getDefaultData(baseTime + 1_000);
    importedData.settings.language = "zh-TW";
    importedData.tags = [
      { id: "tag-imported", name: "导入", color: "#f97316" },
      { id: "tag-work-imported", name: "工作", color: "#10b981" },
    ];
    importedData.notes = [
      { ...localData.notes[0], title: "同 id 导入笔记不覆盖本地" },
      {
        ...importedData.notes[0],
        id: "new-imported-note",
        title: "新增导入笔记",
        tags: ["导入"],
      },
    ];
    const importPath = join(userDataDir, "merge.json");
    await writeStoredData(localData);
    await writeFile(importPath, JSON.stringify(importedData, null, 2), "utf8");
    electronMock.showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: [importPath],
    });
    const { importDataFile } = await importBackup();

    const result = await importDataFile(null, "merge");
    const persisted = await readStoredData();

    expect(result.ok).toBe(true);
    expect(result.filePath).toBe(importPath);
    expect(result.data?.settings).toEqual(localData.settings);
    expect(result.data?.tags.map((tag) => tag.name)).toEqual(["工作", "本地", "导入"]);
    expect(result.data?.notes.map((note) => note.id)).toEqual([
      ...localData.notes.map((note) => note.id),
      "new-imported-note",
    ]);
    expect(persisted).toEqual(result.data);
  });

  it("导入非法 JSON 时不改变现有本地数据", async () => {
    const localData = getDefaultData(baseTime);
    const importPath = join(userDataDir, "broken.json");
    await writeStoredData(localData);
    await writeFile(importPath, "{ not valid json", "utf8");
    electronMock.showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: [importPath],
    });
    const { importDataFile } = await importBackup();

    const result = await importDataFile(null, "overwrite");
    const persisted = await readStoredData();

    expect(result).toEqual({
      ok: false,
      filePath: importPath,
      reason: "invalid",
    });
    expect(persisted).toEqual(localData);
  });
});
