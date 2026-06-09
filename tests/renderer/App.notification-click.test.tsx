/** @vitest-environment jsdom */
// React 渲染层通知点击处理测试。
// 作用：
// 1. 验证 onNotificationClick 订阅在 App 挂载时注册。
// 2. 验证通知点击有效笔记时打开编辑器。
// 3. 验证通知点击已删除/回收站笔记时显示反馈。
// 4. 验证组件卸载时取消订阅。
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import type { IdeaNotesData } from "@shared/types";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { BASE_TIME, installApi } from "./testUtils";

function makeData(overrides: Partial<IdeaNotesData> = {}): IdeaNotesData {
  const base = getDefaultData(BASE_TIME);
  return { ...base, notes: [...base.notes], ...overrides };
}

describe("App notification click", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("挂载时向 onNotificationClick 订阅并在卸载时取消", () => {
    const { api, getUnsubscribeCalls } = installApi(getDefaultData(BASE_TIME));
    expect(api.onNotificationClick).not.toHaveBeenCalled();

    const { unmount } = render(<App />);

    // 挂载后应调用 onNotificationClick 注册回调
    expect(api.onNotificationClick).toHaveBeenCalledTimes(1);

    // 卸载后应调用返回的 unsubscribe 函数
    expect(getUnsubscribeCalls()).toBe(0);
    unmount();
    expect(getUnsubscribeCalls()).toBe(1);
  });

  it("通知点击有效笔记时打开编辑器", async () => {
    const { triggerNotificationClick } = installApi(getDefaultData(BASE_TIME));

    render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");

    // 触发通知点击，传入种子笔记 id
    triggerNotificationClick("seed-navigation");

    // 编辑器应打开并显示该笔记的标题
    const dialog = await screen.findByRole("dialog", { name: "编辑笔记" });
    expect(dialog).toBeTruthy();
    expect((screen.getByLabelText("标题") as HTMLInputElement).value).toBe(
      "重构 Desktop App 导航栏",
    );
  });

  it("通知点击回收站笔记时显示删除提示", async () => {
    const data = makeData({
      notes: [
        ...getDefaultData(BASE_TIME).notes.map((n) =>
          n.id === "seed-naming" ? { ...n, status: "trash" as const } : n,
        ),
      ],
    });
    const { triggerNotificationClick } = installApi(data);

    render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");

    // 触发通知点击回收站笔记
    triggerNotificationClick("seed-naming");

    // 应显示删除/回收站提示，且编辑器未打开
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("笔记已被删除或已移至回收站");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("通知点击不存在笔记时显示删除提示", async () => {
    const { triggerNotificationClick } = installApi(getDefaultData(BASE_TIME));

    render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");

    // 触发通知点击不存在的 noteId
    triggerNotificationClick("non-existent-id");

    // 应显示删除提示
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("笔记已被删除或已移至回收站");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
