/** @vitest-environment jsdom */
// React 渲染层数据备份设置测试。
// 作用：
// 1. 覆盖导出成功、导出失败和取消反馈。
// 2. 验证覆盖导入成功、导入取消、合并导入失败等数据管理流程。
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { BASE_TIME, installApi } from "./testUtils";

describe("App settings backup", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("系统设置页可以导出当前数据", async () => {
    const data = getDefaultData(BASE_TIME);
    const { api } = installApi(data);
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    await user.click(screen.getByRole("tab", { name: "数据管理" }));
    await user.click(screen.getByRole("button", { name: "导出数据" }));

    await waitFor(() => expect(api.exportData).toHaveBeenCalledTimes(1));
  });

  it("导出失败时显示失败反馈", async () => {
    const data = getDefaultData(BASE_TIME);
    const { api } = installApi(data);
    api.exportData = vi.fn(async () => ({ ok: false, reason: "failed" as const }));
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    await user.click(screen.getByRole("tab", { name: "数据管理" }));
    await user.click(screen.getByRole("button", { name: "导出数据" }));

    await waitFor(() => expect(api.exportData).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("alert").textContent).toBe("导出失败，请重试。");
  });

  it("导出取消时不显示失败反馈", async () => {
    const data = getDefaultData(BASE_TIME);
    const { api } = installApi(data);
    api.exportData = vi.fn(async () => ({
      ok: false,
      reason: "cancelled" as const,
    }));
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    await user.click(screen.getByRole("tab", { name: "数据管理" }));
    await user.click(screen.getByRole("button", { name: "导出数据" }));

    await waitFor(() => expect(api.exportData).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("覆盖导入前显示确认弹窗，成功后使用导入数据刷新列表", async () => {
    const data = getDefaultData(BASE_TIME);
    const importedData = {
      ...data,
      notes: [
        {
          ...data.notes[0],
          id: "imported-renderer-note",
          title: "导入后的笔记",
        },
      ],
    };
    const { api } = installApi(data);
    api.importData = vi.fn(async () => ({
      ok: true,
      filePath: "/tmp/import.json",
      data: importedData,
    }));
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    await user.click(screen.getByRole("tab", { name: "数据管理" }));
    await user.click(screen.getByRole("button", { name: "覆盖导入" }));
    const dialog = screen.getByRole("dialog", { name: "确认覆盖导入？" });
    await user.click(within(dialog).getByRole("button", { name: "确认" }));

    await waitFor(() => expect(api.importData).toHaveBeenCalledWith("overwrite"));
    await user.click(screen.getByRole("button", { name: "返回" }));
    expect(await screen.findByText("导入后的笔记")).toBeTruthy();
    expect(screen.queryByText("重构 Desktop App 导航栏")).toBeNull();
  });

  it("覆盖导入取消时关闭确认弹窗且不显示失败反馈", async () => {
    const data = getDefaultData(BASE_TIME);
    const { api } = installApi(data);
    api.importData = vi.fn(async () => ({
      ok: false,
      reason: "cancelled" as const,
    }));
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");
    await user.click(screen.getByRole("button", { name: "设置" }));
    await user.click(screen.getByRole("tab", { name: "数据管理" }));
    await user.click(screen.getByRole("button", { name: "覆盖导入" }));
    const dialog = screen.getByRole("dialog", { name: "确认覆盖导入？" });
    await user.click(within(dialog).getByRole("button", { name: "确认" }));

    await waitFor(() => expect(api.importData).toHaveBeenCalledWith("overwrite"));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "确认覆盖导入？" })).toBeNull(),
    );
    expect(screen.queryByRole("alert")).toBeNull();
    await user.click(screen.getByRole("button", { name: "返回" }));
    expect(await screen.findByText("重构 Desktop App 导航栏")).toBeTruthy();
  });

  it("合并导入失败时保留现有数据并显示失败反馈", async () => {
    const data = getDefaultData(BASE_TIME);
    const { api } = installApi(data);
    api.importData = vi.fn(async () => ({ ok: false, reason: "invalid" as const }));
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");
    await user.click(screen.getByRole("button", { name: "设置" }));
    await user.click(screen.getByRole("tab", { name: "数据管理" }));
    await user.click(screen.getByRole("button", { name: "合并导入" }));
    const dialog = screen.getByRole("dialog", { name: "确认合并导入？" });
    await user.click(within(dialog).getByRole("button", { name: "确认" }));

    await waitFor(() => expect(api.importData).toHaveBeenCalledWith("merge"));
    expect(screen.getByRole("alert").textContent).toBe(
      "导入失败，当前数据未改变。请确认文件内容是有效的灵感笔记 JSON。",
    );
    await user.click(screen.getByRole("button", { name: "返回" }));
    expect(await screen.findByText("重构 Desktop App 导航栏")).toBeTruthy();
  });

  it("合并导入失败分支关闭确认弹窗并保留现有数据", async () => {
    const data = getDefaultData(BASE_TIME);
    const { api } = installApi(data);
    api.importData = vi.fn(async () => ({ ok: false, reason: "failed" as const }));
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");
    await user.click(screen.getByRole("button", { name: "设置" }));
    await user.click(screen.getByRole("tab", { name: "数据管理" }));
    await user.click(screen.getByRole("button", { name: "合并导入" }));
    const dialog = screen.getByRole("dialog", { name: "确认合并导入？" });
    await user.click(within(dialog).getByRole("button", { name: "确认" }));

    await waitFor(() => expect(api.importData).toHaveBeenCalledWith("merge"));
    expect(screen.getByRole("alert").textContent).toBe(
      "导入失败，当前数据未改变。请确认文件内容是有效的灵感笔记 JSON。",
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "确认合并导入？" })).toBeNull(),
    );
    await user.click(screen.getByRole("button", { name: "返回" }));
    expect(await screen.findByText("重构 Desktop App 导航栏")).toBeTruthy();
  });
});
