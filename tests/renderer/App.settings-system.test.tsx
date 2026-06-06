/** @vitest-environment jsdom */
// React 渲染层系统设置测试。
// 作用：
// 1. 覆盖开机自启动设置和保存 pending 状态。
// 2. 验证系统状态和本地保存失败之间的回滚行为。
import { act, render, screen, waitFor } from "@testing-library/react";
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
    await user.click(screen.getByRole("button", { name: "系统设置" }));
    const languageSelect = screen.getByRole("combobox", {
      name: /语言/,
    }) as HTMLSelectElement;
    await user.selectOptions(languageSelect, "en");
    await waitFor(() => expect(api.saveData).toHaveBeenCalledTimes(1));

    const startupSwitch = screen.getByRole("checkbox", {
      name: /启动行为/,
    }) as HTMLInputElement;
    expect(languageSelect.disabled).toBe(true);
    expect(startupSwitch.disabled).toBe(true);

    await user.click(startupSwitch);
    expect(api.setStartup).not.toHaveBeenCalled();
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
    await user.click(screen.getByRole("button", { name: "系统设置" }));
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
    await user.click(screen.getByRole("button", { name: "系统设置" }));
    const startupSwitch = screen.getByRole("checkbox", { name: /启动行为/ });

    expect(startupSwitch.closest(".switch")).toBeTruthy();
    await user.click(startupSwitch);

    await waitFor(() => expect(api.setStartup).toHaveBeenCalledWith(true));
    expect(saved.at(-1)?.settings.startup).toBe(false);
  });
});
