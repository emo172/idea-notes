/** @vitest-environment jsdom */
// React 渲染层编辑器更新流程测试。
// 作用：
// 1. 覆盖编辑已有笔记时的时间戳展示和更新时间刷新。
// 2. 验证正文重建清单时保留相同位置同文本的勾选状态。
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { appCopy } from "../../src/renderer/src/i18n";
import { formatDate } from "../../src/renderer/src/utils/dateFormatting";
import { BASE_TIME, installApi } from "./testUtils";

describe("App editor update", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("编辑已有笔记时显示创建时间和修改时间并在保存后刷新修改时间", async () => {
    const saveTime = Date.parse("2026-05-30T09:30:00.000Z");
    const initialData = getDefaultData(BASE_TIME);
    const sourceNote = initialData.notes[0];
    const copy = appCopy["zh-CN"];
    const { api, saved } = installApi(initialData);
    const user = userEvent.setup();

    vi.spyOn(Date, "now").mockReturnValue(saveTime);
    render(<App />);

    await user.click(await screen.findByRole("button", { name: sourceNote.title }));

    screen.getByText(copy.createdAt);
    screen.getByText(copy.updatedAt);
    screen.getByText(formatDate(sourceNote.createdAt, "zh-CN", copy));
    screen.getByText(formatDate(sourceNote.updatedAt, "zh-CN", copy));

    await user.clear(screen.getByLabelText(copy.title));
    await user.type(screen.getByLabelText(copy.title), "更新后的导航栏笔记");
    await user.click(screen.getByRole("button", { name: copy.saveNote }));

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    const savedNote = saved.at(-1)?.notes.find((note) => note.id === sourceNote.id);
    expect(savedNote?.createdAt).toBe(sourceNote.createdAt);
    expect(savedNote?.updatedAt).toBe(saveTime);
  });

  it("编辑正文重建清单时保留相同位置同文本的勾选状态", async () => {
    const initialData = getDefaultData(BASE_TIME);
    const sourceNote = {
      ...initialData.notes[0],
      body: "保留任务\n改写前任务",
      checklist: [
        {
          id: "seed-navigation-item-1",
          text: "保留任务",
          checked: true,
        },
        {
          id: "seed-navigation-item-2",
          text: "改写前任务",
          checked: true,
        },
      ],
    };
    const { api, saved } = installApi({
      ...initialData,
      notes: [sourceNote, ...initialData.notes.slice(1)],
    });
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: sourceNote.title }));
    await user.clear(screen.getByLabelText("正文"));
    await user.type(screen.getByLabelText("正文"), "保留任务\n改写后任务");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    const savedNote = saved.at(-1)?.notes.find((item) => item.id === sourceNote.id);
    expect(savedNote?.checklist).toEqual([
      {
        id: "seed-navigation-item-1",
        text: "保留任务",
        checked: true,
      },
      {
        id: "seed-navigation-item-2",
        text: "改写后任务",
        checked: false,
      },
    ]);
  });
});
