/** @vitest-environment jsdom */
// React 渲染层提醒设置测试。
// 作用：
// 1. 覆盖系统设置页开启截止提醒。
// 2. 验证提前提醒时间会保存到设置数据。
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { BASE_TIME, installApi } from "./testUtils";

describe("App settings reminders", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("系统设置页可以开启截止提醒并保存提前量", async () => {
    const data = getDefaultData(BASE_TIME);
    data.settings.reminders = { enabled: false, leadMinutes: 10 };
    const { saved } = installApi(data);
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    await user.click(screen.getByRole("tab", { name: "提醒设置" }));
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
});
