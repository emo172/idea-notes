/** @vitest-environment jsdom */
// React 渲染层测试。
// 作用：
// 1. 使用 jsdom 模拟浏览器环境，避免启动真实 Electron 窗口。
// 2. 用假的 window.ideaNotes 验证 App 会从 preload API 加载数据。
// 3. 按功能域拆分测试，避免单个文件过大。
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { appCopy } from "../../src/renderer/src/i18n";
import { formatDate } from "../../src/renderer/src/utils/dateFormatting";
import { BASE_TIME, installApi } from "./testUtils";

describe("App core", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("UI 时间格式显示具体年份", () => {
    expect(formatDate(BASE_TIME, "zh-CN", appCopy["zh-CN"])).toContain("2026");
  });

  it("加载本地数据并显示种子笔记", async () => {
    // 首屏必须从 preload API 加载数据，并展示默认的进行中笔记列表。
    installApi(getDefaultData(BASE_TIME));

    render(<App />);

    expect(await screen.findByText("重构 Desktop App 导航栏")).toBeTruthy();
    expect(screen.getByText("进行中")).toBeTruthy();
  });

  it("加载本地数据失败时显示错误并支持重试", async () => {
    const data = getDefaultData(BASE_TIME);
    const getData = vi
      .fn()
      .mockRejectedValueOnce(new Error("broken local data"))
      .mockResolvedValueOnce(data);
    installApi(data, { getData });
    const user = userEvent.setup();

    render(<App />);

    expect(await screen.findByText("本地笔记加载失败")).toBeTruthy();
    expect(
      screen.getByText("请检查本地数据文件后重试，应用不会覆盖现有数据。"),
    ).toBeTruthy();
    expect(screen.queryByText("正在加载本地笔记...")).toBeNull();

    await user.click(screen.getByRole("button", { name: "重试" }));

    expect(await screen.findByText("重构 Desktop App 导航栏")).toBeTruthy();
    await waitFor(() => expect(getData).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("本地笔记加载失败")).toBeNull();
  });
});
