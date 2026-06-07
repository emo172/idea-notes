/** @vitest-environment jsdom */
// React 渲染层回收站确认流程测试。
// 作用：
// 1. 覆盖彻底删除前确认和取消路径。
// 2. 验证清空回收站确认后只删除回收站记录。
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { BASE_TIME, installApi } from "./testUtils";

describe("App trash confirm", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("删除回收站笔记前要求确认", async () => {
    const trashData = getDefaultData(BASE_TIME);
    const deleteDialogName = "确认彻底删除？";
    trashData.notes = [
      {
        ...trashData.notes[0],
        status: "trash",
        trashedAt: Date.parse("2026-05-29T09:00:00.000Z"),
      },
      trashData.notes[1],
    ];
    const { api, saved } = installApi(trashData);
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: /回收站/ }));
    await user.click(screen.getByRole("button", { name: "删除" }));
    screen.getByRole("dialog", { name: deleteDialogName });
    expect(api.saveData).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.queryByRole("dialog", { name: deleteDialogName })).toBeNull();
    expect(api.saveData).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "删除" }));
    await user.click(screen.getByRole("button", { name: "确认" }));

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    expect(saved.at(-1)?.notes.map((note) => note.id)).not.toContain("seed-navigation");
  });

  it("清空回收站前要求确认并只删除回收站全部记录", async () => {
    const trashData = getDefaultData(BASE_TIME);
    const clearTrashDialogName = "确认清空回收站？";
    trashData.notes = [
      {
        ...trashData.notes[0],
        id: "first-trash-note",
        status: "trash",
        trashedAt: Date.parse("2026-05-29T09:00:00.000Z"),
      },
      {
        ...trashData.notes[1],
        id: "second-trash-note",
        status: "trash",
        trashedAt: Date.parse("2026-05-29T10:00:00.000Z"),
      },
      {
        ...trashData.notes[1],
        id: "active-note",
        title: "保留进行中笔记",
        status: "active",
      },
    ];
    const { api, saved } = installApi(trashData);
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: /回收站/ }));
    await user.click(screen.getByRole("button", { name: "清空回收站" }));
    screen.getByRole("dialog", { name: clearTrashDialogName });
    expect(api.saveData).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.queryByRole("dialog", { name: clearTrashDialogName })).toBeNull();
    expect(api.saveData).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "清空回收站" }));
    await user.click(screen.getByRole("button", { name: "确认" }));

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    expect(saved.at(-1)?.notes.map((note) => note.id)).toEqual(["active-note"]);
  });
});
