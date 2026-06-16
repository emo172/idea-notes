// 主进程 Markdown 文件导入导出测试。
// 作用：
// 1. 验证 Markdown 单条导出、当前列表批量导出和多文件导入。
// 2. 锁定部分无效文件不会阻断有效文件写入本地数据。
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
const baseTime = Date.parse("2026-06-16T08:00:00.000Z");
let userDataDir = "";

async function importMarkdownFiles(): Promise<
  typeof import("../../src/main/store/markdownFiles")
> {
  vi.resetModules();
  return import("../../src/main/store/markdownFiles");
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

describe("主进程 Markdown 文件导入导出", () => {
  beforeEach(async () => {
    userDataDir = await mkdtemp(join(tmpdir(), "idea-notes-markdown-"));
    electronMock.getPath.mockReturnValue(userDataDir);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    if (userDataDir) await rm(userDataDir, { force: true, recursive: true });
  });

  it("单条导出 Markdown 到用户选择的文件", async () => {
    const data = getDefaultData(baseTime);
    await writeStoredData(data);
    const exportPath = join(userDataDir, "single.md");
    electronMock.showSaveDialog.mockResolvedValue({
      canceled: false,
      filePath: exportPath,
    });
    const { exportNoteMarkdownFile } = await importMarkdownFiles();

    const result = await exportNoteMarkdownFile(null, data.notes[0].id);

    expect(result).toEqual({ ok: true, filePath: exportPath, exportedCount: 1 });
    expect(await readFile(exportPath, "utf8")).toContain("# 重构 Desktop App 导航栏");
  });

  it("批量导出多个 Markdown 文件并处理重复标题", async () => {
    const data = getDefaultData(baseTime);
    data.notes = [
      { ...data.notes[0], id: "note-a", title: "同名" },
      { ...data.notes[1], id: "note-b", title: "同名" },
    ];
    await writeStoredData(data);
    const exportDir = join(userDataDir, "markdown-export");
    electronMock.showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: [exportDir],
    });
    const { exportNotesMarkdownFiles } = await importMarkdownFiles();

    const result = await exportNotesMarkdownFiles(null, ["note-a", "note-b"]);

    expect(result).toEqual({ ok: true, filePath: exportDir, exportedCount: 2 });
    expect(await readFile(join(exportDir, "同名.md"), "utf8")).toContain("# 同名");
    expect(await readFile(join(exportDir, "同名-2.md"), "utf8")).toContain("# 同名");
  });

  it("批量导出时不覆盖目标目录已有 Markdown 文件", async () => {
    const data = getDefaultData(baseTime);
    data.notes = [{ ...data.notes[0], id: "note-a", title: "同名" }];
    await writeStoredData(data);
    const exportDir = join(userDataDir, "markdown-export-existing");
    await mkdir(exportDir);
    await writeFile(join(exportDir, "同名.md"), "existing content", "utf8");
    electronMock.showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: [exportDir],
    });
    const { exportNotesMarkdownFiles } = await importMarkdownFiles();

    const result = await exportNotesMarkdownFiles(null, ["note-a"]);

    expect(result).toEqual({ ok: true, filePath: exportDir, exportedCount: 1 });
    expect(await readFile(join(exportDir, "同名.md"), "utf8")).toBe("existing content");
    expect(await readFile(join(exportDir, "同名-2.md"), "utf8")).toContain("# 同名");
  });

  it("多选导入 Markdown 文件并一次性保存为新笔记", async () => {
    const data = getDefaultData(baseTime);
    await writeStoredData(data);
    const firstPath = join(userDataDir, "first.md");
    const secondPath = join(userDataDir, "second.markdown");
    await writeFile(firstPath, "# 第一条\n- [x] 完成项", "utf8");
    await writeFile(secondPath, "没有标题正文", "utf8");
    electronMock.showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: [firstPath, secondPath],
    });
    const { importMarkdownFilesFromDialog } = await importMarkdownFiles();

    const result = await importMarkdownFilesFromDialog(null, "未命名笔记");
    const persisted = await readStoredData();

    expect(result.ok).toBe(true);
    expect(result.importedCount).toBe(2);
    expect(result.data?.notes.slice(0, 2).map((note) => note.title)).toEqual([
      "第一条",
      "second",
    ]);
    expect(result.data?.notes[0]?.checklist[0]).toMatchObject({
      text: "- [x] 完成项",
      checked: true,
    });
    expect(persisted).toEqual(result.data);
  });

  it("导入 metadata 标签时同步补齐全局标签库", async () => {
    const data = getDefaultData(baseTime);
    await writeStoredData(data);
    const filePath = join(userDataDir, "tagged.md");
    await writeFile(
      filePath,
      '# 带标签\n<!-- idea-notes: {"priority":"low","tags":["导入标签"],"checkedStates":[false]} -->\n\n正文',
      "utf8",
    );
    electronMock.showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: [filePath],
    });
    const { importMarkdownFilesFromDialog } = await importMarkdownFiles();

    const result = await importMarkdownFilesFromDialog(null, "未命名笔记");

    expect(result.ok).toBe(true);
    expect(result.data?.notes[0]?.tags).toEqual(["导入标签"]);
    expect(result.data?.tags.map((tag) => tag.name)).toContain("导入标签");
  });

  it("拖放导入时跳过非 Markdown 路径并报告 skippedFiles", async () => {
    const data = getDefaultData(baseTime);
    await writeStoredData(data);
    const validPath = join(userDataDir, "valid.md");
    const invalidPath = join(userDataDir, "invalid.txt");
    await writeFile(validPath, "# 拖放导入\n正文", "utf8");
    await writeFile(invalidPath, "plain text", "utf8");
    const { importDroppedMarkdownFiles } = await importMarkdownFiles();

    const result = await importDroppedMarkdownFiles(
      [validPath, invalidPath],
      "未命名笔记",
    );

    expect(result.ok).toBe(true);
    expect(result.importedCount).toBe(1);
    expect(result.skippedFiles).toEqual([invalidPath]);
    expect(result.data?.notes[0]?.title).toBe("拖放导入");
  });

  it("没有有效 Markdown 文件时不改变本地数据", async () => {
    const data = getDefaultData(baseTime);
    await writeStoredData(data);
    const invalidPath = join(userDataDir, "plain.txt");
    const { importDroppedMarkdownFiles } = await importMarkdownFiles();

    const result = await importDroppedMarkdownFiles([invalidPath], "未命名笔记");

    expect(result).toEqual({
      ok: false,
      reason: "invalid",
      importedCount: 0,
      skippedFiles: [invalidPath],
    });
    expect(await readStoredData()).toEqual(data);
  });
});
