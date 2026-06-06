/** @vitest-environment jsdom */
// React 渲染层系统设置测试。
// 作用：
// 1. 覆盖开机自启动设置和保存 pending 状态。
// 2. 验证系统状态和本地保存失败之间的回滚行为。
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import type { IdeaNotesData } from "@shared/types";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { BASE_TIME, installApi } from "./testUtils";

describe("App settings system", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("设置保存 pending 时禁用设置控件并阻止开机自启动副作用", async () => {
    const data = getDefaultData(BASE_TIME);
    data.settings.startup = false;
    let resolveSave: ((data: IdeaNotesData) => void) | undefined;
    const { api } = installApi(data);
    api.saveData = vi.fn(
      (_nextData) =>
        new Promise<IdeaNotesData>((resolve) => {
          resolveSave = resolve;
        }),
    );
    api.setStartup = vi.fn(async (enabled) => enabled);
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    await user.click(screen.getByRole("button", { name: "界面设置" }));
    const languageSelect = screen.getByRole("combobox", {
      name: /语言/,
    }) as HTMLSelectElement;
    await user.selectOptions(languageSelect, "en");
    await waitFor(() => expect(api.saveData).toHaveBeenCalledTimes(1));

    expect(languageSelect.disabled).toBe(true);
    const startupTab = screen.getByRole("button", { name: "启动行为" });
    expect((startupTab as HTMLButtonElement).disabled).toBe(true);

    await user.click(startupTab);
    expect(api.setStartup).not.toHaveBeenCalled();
    expect(screen.queryByRole("checkbox", { name: /启动行为/ })).toBeNull();
    expect(api.saveData).toHaveBeenCalledTimes(1);

    const finishSave = resolveSave;
    if (!finishSave) throw new Error("save promise was not created");
    await act(async () => {
      finishSave({
        ...data,
        settings: {
          ...data.settings,
          language: "en",
        },
      });
    });
  });

  it("开机自启动系统变更成功但保存失败时回滚系统状态", async () => {
    const data = getDefaultData(BASE_TIME);
    data.settings.startup = false;
    const { api } = installApi(data);
    api.setStartup = vi.fn(async (enabled) => enabled);
    api.saveData = vi.fn(async () => {
      throw new Error("write failed");
    });
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    await user.click(screen.getByRole("button", { name: "启动行为" }));
    const startupSwitch = screen.getByRole("checkbox", {
      name: /启动行为/,
    }) as HTMLInputElement;
    await user.click(startupSwitch);

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    expect(api.setStartup).toHaveBeenNthCalledWith(1, true);
    expect(api.setStartup).toHaveBeenNthCalledWith(2, false);
    expect(startupSwitch.checked).toBe(false);
    expect(screen.getByRole("alert").textContent).toBe(
      "保存失败，本地数据没有写入。请重试。",
    );
  });

  it("开机自启动使用开关并保存主进程返回值", async () => {
    const data = getDefaultData(BASE_TIME);
    data.settings.startup = false;
    const { api, saved } = installApi(data);
    api.setStartup = vi.fn(async () => false);
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    await user.click(screen.getByRole("button", { name: "启动行为" }));
    const startupSwitch = screen.getByRole("checkbox", { name: /启动行为/ });

    expect(startupSwitch.closest(".switch")).toBeTruthy();
    await user.click(startupSwitch);

    await waitFor(() => expect(api.setStartup).toHaveBeenCalledWith(true));
    expect(saved.at(-1)?.settings.startup).toBe(false);
  });

  it("系统设置页可以开启截止提醒并保存提前量", async () => {
    const data = getDefaultData(BASE_TIME);
    data.settings.reminders = { enabled: false, leadMinutes: 10 };
    const { saved } = installApi(data);
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    await user.click(screen.getByRole("button", { name: "提醒设置" }));
    const reminderSwitch = screen.getByRole("checkbox", {
      name: /截止提醒/,
    }) as HTMLInputElement;
    const leadSelect = screen.getByRole("combobox", {
      name: /提前提醒/,
    }) as HTMLSelectElement;

    expect(reminderSwitch.checked).toBe(false);
    expect(leadSelect.value).toBe("10");

    await user.click(reminderSwitch);
    await waitFor(() =>
      expect(saved.at(-1)?.settings.reminders).toEqual({
        enabled: true,
        leadMinutes: 10,
      }),
    );

    await user.selectOptions(leadSelect, "60");
    await waitFor(() =>
      expect(saved.at(-1)?.settings.reminders).toEqual({
        enabled: true,
        leadMinutes: 60,
      }),
    );
  });

  it("系统设置页可以导出当前数据", async () => {
    const data = getDefaultData(BASE_TIME);
    const { api } = installApi(data);
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    await user.click(screen.getByRole("button", { name: "数据管理" }));
    await user.click(screen.getByRole("button", { name: "导出数据" }));

    await waitFor(() => expect(api.exportData).toHaveBeenCalledTimes(1));
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
    await user.click(screen.getByRole("button", { name: "数据管理" }));
    await user.click(screen.getByRole("button", { name: "覆盖导入" }));
    const dialog = screen.getByRole("dialog", { name: "确认覆盖导入？" });
    await user.click(within(dialog).getByRole("button", { name: "确认" }));

    await waitFor(() => expect(api.importData).toHaveBeenCalledWith("overwrite"));
    await user.click(screen.getByRole("button", { name: "返回" }));
    expect(await screen.findByText("导入后的笔记")).toBeTruthy();
    expect(screen.queryByText("重构 Desktop App 导航栏")).toBeNull();
  });

  it("合并导入失败时保留现有数据并显示失败反馈", async () => {
    const data = getDefaultData(BASE_TIME);
    const { api } = installApi(data);
    api.importData = vi.fn(async () => ({ ok: false, reason: "invalid" as const }));
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");
    await user.click(screen.getByRole("button", { name: "设置" }));
    await user.click(screen.getByRole("button", { name: "数据管理" }));
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
});
