/** @vitest-environment jsdom */
// React 渲染层回收站动作测试。
// 作用：
// 1. 覆盖回收站卡片菜单在不同状态下的可用动作。
// 2. 验证已完成笔记移入回收站后会恢复到删除前状态。
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { BASE_TIME, installApi } from "./testUtils";

describe("App trash actions", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("已完成笔记移入回收站后恢复到删除前状态", async () => {
    const completedData = getDefaultData(BASE_TIME);
    completedData.notes = [
      {
        ...completedData.notes[0],
        status: "completed",
      },
      completedData.notes[1],
    ];
    const { api, saved } = installApi(completedData);
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: /已完成/ }));
    const completedCard = (await screen.findByText("重构 Desktop App 导航栏")).closest(
      "article",
    ) as HTMLElement;
    await user.click(within(completedCard).getByRole("button", { name: "删除" }));

    await waitFor(() => expect(api.saveData).toHaveBeenCalledTimes(1));
    const trashedNote = saved
      .at(-1)
      ?.notes.find((note) => note.id === "seed-navigation");
    expect(trashedNote).toMatchObject({
      status: "trash",
      previousStatus: "completed",
    });

    await user.click(screen.getByRole("button", { name: /回收站/ }));
    const trashCard = (await screen.findByText("重构 Desktop App 导航栏")).closest(
      "article",
    ) as HTMLElement;
    await user.click(within(trashCard).getByRole("button", { name: "恢复" }));

    await waitFor(() => expect(api.saveData).toHaveBeenCalledTimes(2));
    const restoredNote = saved
      .at(-1)
      ?.notes.find((note) => note.id === "seed-navigation");
    expect(restoredNote?.status).toBe("completed");
    expect(restoredNote).not.toHaveProperty("previousStatus");
  });

  it("更多操作菜单按笔记状态展示恢复和删除", async () => {
    const trashData = getDefaultData(BASE_TIME);
    trashData.notes = [
      {
        ...trashData.notes[0],
        status: "trash",
        trashedAt: Date.parse("2026-05-29T09:00:00.000Z"),
      },
      trashData.notes[1],
    ];
    const { api } = installApi(trashData);
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: /回收站/ }));
    const title = await screen.findByText("重构 Desktop App 导航栏");
    const card = title.closest("article");
    expect(card).toBeTruthy();
    expect(
      within(card as HTMLElement).queryByRole("button", { name: "编辑笔记" }),
    ).toBeNull();
    expect(
      within(card as HTMLElement).queryByRole("button", {
        name: "重构 Desktop App 导航栏",
      }),
    ).toBeNull();
    const checklistInput = within(card as HTMLElement).getByRole("checkbox", {
      name: "增加置顶按钮",
    }) as HTMLInputElement;
    expect(checklistInput.disabled).toBe(true);
    await user.click(checklistInput);
    expect(api.saveData).not.toHaveBeenCalled();

    await user.click(
      within(card as HTMLElement).getByRole("button", { name: "更多操作" }),
    );
    const menu = screen.getByRole("menu", { name: "更多操作" });

    expect(within(menu).getByRole("menuitem", { name: "恢复" })).toBeTruthy();
    expect(within(menu).getByRole("menuitem", { name: "删除" })).toBeTruthy();
    expect(within(menu).queryByRole("menuitem", { name: "编辑" })).toBeNull();
    expect(within(menu).queryByRole("menuitem", { name: "复制" })).toBeNull();

    await user.click(within(menu).getByRole("menuitem", { name: "删除" }));

    expect(screen.getByRole("dialog", { name: "确认彻底删除？" })).toBeTruthy();
  });
});
