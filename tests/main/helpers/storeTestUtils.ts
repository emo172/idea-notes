// 主进程 store 测试共用夹具。
// 作用：
// 1. 提供 Electron app.getPath mock 和临时 userData 目录。
// 2. 封装 store 动态导入，避免模块缓存污染跨用例状态。
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, vi } from "vitest";
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

export const dataFileName = "idea-notes-data.json";
export const baseTime = Date.parse("2026-05-29T08:00:00.000Z");

export function getElectronMock(): typeof electronMock {
  return electronMock;
}

export function setupStoreTest(): {
  readonly userDataDir: string;
  dataFilePath: (fileName?: string) => string;
} {
  let userDataDir = "";

  beforeEach(async () => {
    userDataDir = await mkdtemp(join(tmpdir(), "idea-notes-store-"));
    electronMock.getPath.mockReturnValue(userDataDir);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    if (userDataDir) await rm(userDataDir, { force: true, recursive: true });
    userDataDir = "";
  });

  return {
    get userDataDir() {
      return userDataDir;
    },
    dataFilePath(fileName = dataFileName) {
      return join(userDataDir, fileName);
    },
  };
}

export function dataWithTrashRetention(now: number): IdeaNotesData {
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

export async function importStore(): Promise<typeof import("../../../src/main/store")> {
  vi.resetModules();
  return import("../../../src/main/store");
}
