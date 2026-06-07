// shared 业务逻辑聚合导出测试。
// 作用：
// 1. 验证 @shared/noteLogic 仍保留跨模块聚合导出入口。
// 2. 防止主进程、preload、renderer 和旧测试引用的关键导出意外丢失。
import { describe, expect, it } from "vitest";
import { createNote, filterAndSortNotes, renameTag } from "@shared/noteLogic";

describe("noteLogic", () => {
  it("保持 shared 业务逻辑聚合导出入口", () => {
    expect(typeof createNote).toBe("function");
    expect(typeof filterAndSortNotes).toBe("function");
    expect(typeof renameTag).toBe("function");
  });
});
