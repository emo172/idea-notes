/** @vitest-environment jsdom */
// React 渲染层回收站流程测试。
// 作用：
// 1. 覆盖移入回收站、恢复、彻底删除和清空回收站。
// 2. 覆盖回收站保存失败时的状态保留和错误提示。
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { BASE_TIME, installApi } from "./testUtils";

describe("App trash flow", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("卡片移入回收站保存失败时保留当前视图和原卡片状态并显示错误提示", async () => {
    const { api } = installApi(getDefaultData(BASE_TIME));
    api.saveData = vi.fn(async () => {
      throw new Error("write failed");
    });
    const user = userEvent.setup();

    render(<App />);

    const title = await screen.findByText("重构 Desktop App 导航栏");
    const card = title.closest("article") as HTMLElement;
    await user.click(within(card).getByRole("button", { name: "删除" }));

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    const currentCard = screen
      .getByText("重构 Desktop App 导航栏")
      .closest("article") as HTMLElement;
    expect(within(currentCard).getByText(/状态：进行中/)).toBeTruthy();
    expect(screen.getByRole("region", { name: "进行中" })).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe(
      "保存失败，本地数据没有写入。请重试。",
    );
  });

  it("回收站恢复保存失败时保留回收站视图和原卡片状态并显示错误提示", async () => {
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
    api.saveData = vi.fn(async () => {
      throw new Error("write failed");
    });
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: /回收站/ }));
    const title = await screen.findByText("重构 Desktop App 导航栏");
    const card = title.closest("article") as HTMLElement;
    await user.click(within(card).getByRole("button", { name: "恢复" }));

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    const currentCard = screen
      .getByText("重构 Desktop App 导航栏")
      .closest("article") as HTMLElement;
    expect(within(currentCard).getByText(/状态：回收站/)).toBeTruthy();
    expect(screen.getByRole("region", { name: "回收站" })).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe(
      "保存失败，本地数据没有写入。请重试。",
    );
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

  it("彻底删除保存失败时保留确认弹窗和回收站笔记并显示错误提示", async () => {
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
    const { api } = installApi(trashData);
    api.saveData = vi.fn(async () => {
      throw new Error("write failed");
    });
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: /回收站/ }));
    await user.click(screen.getByRole("button", { name: "删除" }));
    const confirmDialog = await screen.findByRole("dialog", {
      name: deleteDialogName,
    });
    await user.click(within(confirmDialog).getByRole("button", { name: "确认" }));

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    expect(screen.getByRole("dialog", { name: deleteDialogName })).toBeTruthy();
    expect(screen.getByText("重构 Desktop App 导航栏")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe(
      "保存失败，本地数据没有写入。请重试。",
    );
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

  it("清空回收站保存失败时保留确认弹窗和回收站笔记并显示错误提示", async () => {
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
    ];
    const { api } = installApi(trashData);
    api.saveData = vi.fn(async () => {
      throw new Error("write failed");
    });
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: /回收站/ }));
    await user.click(screen.getByRole("button", { name: "清空回收站" }));
    const confirmDialog = await screen.findByRole("dialog", {
      name: clearTrashDialogName,
    });
    await user.click(within(confirmDialog).getByRole("button", { name: "确认" }));

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    expect(screen.getByRole("dialog", { name: clearTrashDialogName })).toBeTruthy();
    expect(screen.getByText("重构 Desktop App 导航栏")).toBeTruthy();
    expect(screen.getByText("产品命名灵感")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe(
      "保存失败，本地数据没有写入。请重试。",
    );
  });
});
