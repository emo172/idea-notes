/** @vitest-environment jsdom */
// React 渲染层笔记卡片动作测试。
// 作用：
// 1. 覆盖卡片完成、删除、编辑入口和更多操作菜单。
// 2. 覆盖保存失败和保存中忙碌反馈。
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import type { IdeaNotesData } from "@shared/types";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { BASE_TIME, installApi } from "./testUtils";

describe("App card actions", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("卡片状态保存失败时保留当前视图和原卡片状态并显示错误提示", async () => {
    const { api } = installApi(getDefaultData(BASE_TIME));
    api.saveData = vi.fn(async () => {
      throw new Error("write failed");
    });
    const user = userEvent.setup();

    render(<App />);

    const title = await screen.findByText("重构 Desktop App 导航栏");
    const card = title.closest("article") as HTMLElement;
    await user.click(within(card).getByRole("button", { name: "完成" }));

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

  it("保存进行中再次触发卡片保存动作时显示忙碌提示", async () => {
    const { api } = installApi(getDefaultData(BASE_TIME));
    let resolveSave: ((data: IdeaNotesData) => void) | undefined;
    api.saveData = vi.fn(
      (_nextData) =>
        new Promise<IdeaNotesData>((resolve) => {
          resolveSave = resolve;
        }),
    );
    const user = userEvent.setup();

    render(<App />);

    const title = await screen.findByText("重构 Desktop App 导航栏");
    const card = title.closest("article") as HTMLElement;
    await user.click(within(card).getByRole("button", { name: "完成" }));
    await waitFor(() => expect(api.saveData).toHaveBeenCalledTimes(1));
    await user.click(within(card).getByRole("button", { name: "删除" }));
    await user.click(within(card).getByRole("button", { name: "编辑笔记" }));

    expect(api.saveData).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("heading", { name: "编辑笔记" })).toBeNull();
    expect(screen.getByRole("alert").textContent).toBe("正在保存，请稍后再试。");

    const finishSave = resolveSave;
    if (!finishSave) throw new Error("save promise was not created");
    await act(async () => {
      finishSave(getDefaultData(BASE_TIME));
    });
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  it("笔记卡片底部只保留完成和删除按钮", async () => {
    installApi(getDefaultData(BASE_TIME));

    render(<App />);

    const title = await screen.findByText("重构 Desktop App 导航栏");
    const card = title.closest("article");
    expect(card).toBeTruthy();
    const actions = (card as HTMLElement).querySelector(".card-actions");
    expect(actions).toBeTruthy();

    within(actions as HTMLElement).getByRole("button", { name: "完成" });
    within(actions as HTMLElement).getByRole("button", { name: "删除" });
    expect(
      within(actions as HTMLElement).queryByRole("button", { name: "复制" }),
    ).toBeNull();
    expect((actions as HTMLElement).querySelectorAll("button")).toHaveLength(2);
  });

  it("笔记卡片按原型提供编辑按钮和更多操作菜单", async () => {
    const { api, saved } = installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");
    await user.click(screen.getAllByRole("button", { name: "编辑笔记" })[0]);
    expect(screen.getByRole("heading", { name: "编辑笔记" })).toBeTruthy();
    expect(screen.getByDisplayValue("重构 Desktop App 导航栏")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "取消" }));

    await user.click(screen.getAllByRole("button", { name: "更多操作" })[0]);
    const menu = screen.getByRole("menu", { name: "更多操作" });
    for (const label of ["编辑", "完成", "复制", "删除"]) {
      expect(within(menu).getByRole("menuitem", { name: label })).toBeTruthy();
    }

    await user.click(within(menu).getByRole("menuitem", { name: "复制" }));

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    expect(saved.at(-1)?.notes[0]?.title).toBe("重构 Desktop App 导航栏 副本");
    expect(screen.queryByRole("menu", { name: "更多操作" })).toBeNull();
  });

  it("已完成笔记只在更多菜单展示恢复和删除且不能编辑", async () => {
    const completedData = getDefaultData(BASE_TIME);
    completedData.notes = [
      {
        ...completedData.notes[0],
        status: "completed",
      },
      completedData.notes[1],
    ];
    const { api } = installApi(completedData);
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: /已完成/ }));
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
    expect(within(menu).queryByRole("menuitem", { name: "完成" })).toBeNull();
    expect(within(menu).queryByRole("menuitem", { name: "复制" })).toBeNull();
  });
});
