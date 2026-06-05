// 笔记截止状态工具测试。
// 作用：
// 1. 锁定当前 dueAt 使用 datetime-local 字符串的判断契约。
// 2. 验证缺失或非法日期不会错误高亮卡片。
import { afterEach, describe, expect, it, vi } from "vitest";
import { getDeadlineStatus } from "../../src/renderer/src/components/notes/noteDeadline";

describe("getDeadlineStatus", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("按本地 datetime-local 字符串判断已截止和未截止状态", () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-05-29T08:00:00.000Z"));

    expect(getDeadlineStatus("2026-05-28T18:00")).toBe("overdue");
    expect(getDeadlineStatus("2026-05-30T18:00")).toBe("pending");
  });

  it("缺失或非法日期返回空状态", () => {
    expect(getDeadlineStatus()).toBeNull();
    expect(getDeadlineStatus("")).toBeNull();
    expect(getDeadlineStatus("不是有效日期")).toBeNull();
  });
});
