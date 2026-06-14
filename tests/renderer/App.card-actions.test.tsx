/** @vitest-environment jsdom */
// React 渲染层笔记卡片动作测试。
// 作用：
// 1. 覆盖卡片完成、删除、编辑入口和更多操作菜单。
// 2. 覆盖保存失败和保存中忙碌反馈。
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import type { IdeaNotesData } from "@shared/types";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { BASE_TIME, installApi } from "./testUtils";

describe("App card actions", () => {
  beforeEach(() => {
    cleanup();
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

  it("非回收站笔记卡片底部展示完成、归档和删除按钮", async () => {
    installApi(getDefaultData(BASE_TIME));

    render(<App />);

    const title = await screen.findByText("重构 Desktop App 导航栏");
    const card = title.closest("article");
    expect(card).toBeTruthy();
    const actions = (card as HTMLElement).querySelector(".card-actions");
    expect(actions).toBeTruthy();

    within(actions as HTMLElement).getByRole("button", { name: "完成" });
    within(actions as HTMLElement).getByRole("button", { name: "归档" });
    within(actions as HTMLElement).getByRole("button", { name: "删除" });
    expect(
      within(actions as HTMLElement).queryByRole("button", { name: "复制" }),
    ).toBeNull();
    expect((actions as HTMLElement).querySelectorAll("button")).toHaveLength(3);
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
    for (const label of ["编辑", "完成", "复制", "复制标题", "复制正文", "删除"]) {
      expect(within(menu).getByRole("menuitem", { name: label })).toBeTruthy();
    }

    await user.click(within(menu).getByRole("menuitem", { name: "复制" }));

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    expect(saved.at(-1)?.notes[0]?.title).toBe("重构 Desktop App 导航栏 副本");
    expect(screen.queryByRole("menu", { name: "更多操作" })).toBeNull();
  });

  it("更多操作菜单复制标题到剪贴板", async () => {
    const { api } = installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    const title = await screen.findByText("重构 Desktop App 导航栏");
    const card = title.closest("article") as HTMLElement;
    await user.click(within(card).getByRole("button", { name: "更多操作" }));
    const menu = screen.getByRole("menu", { name: "更多操作" });
    const copyTitle = within(menu).getByRole("menuitem", { name: "复制标题" });

    expect((copyTitle as HTMLButtonElement).disabled).toBe(false);
    await user.click(copyTitle);

    expect(api.copyToClipboard).toHaveBeenCalledTimes(1);
    expect(api.copyToClipboard).toHaveBeenCalledWith("重构 Desktop App 导航栏");
  });

  it("更多操作菜单复制标题成功后显示短成功提示", async () => {
    installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    const title = await screen.findByText("重构 Desktop App 导航栏");
    const card = title.closest("article") as HTMLElement;
    await user.click(within(card).getByRole("button", { name: "更多操作" }));
    const menu = screen.getByRole("menu", { name: "更多操作" });

    await user.click(within(menu).getByRole("menuitem", { name: "复制标题" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("标题已复制。");
  });

  it("更多操作菜单复制标题失败后显示错误提示", async () => {
    const { api } = installApi(getDefaultData(BASE_TIME));
    api.copyToClipboard = vi.fn(async () => {
      throw new Error("clipboard denied");
    });
    const user = userEvent.setup();

    render(<App />);

    const title = await screen.findByText("重构 Desktop App 导航栏");
    const card = title.closest("article") as HTMLElement;
    await user.click(within(card).getByRole("button", { name: "更多操作" }));
    const menu = screen.getByRole("menu", { name: "更多操作" });

    await user.click(within(menu).getByRole("menuitem", { name: "复制标题" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("复制失败，请重试。");
  });

  it("剪贴板 API 缺失时禁用复制标题和复制正文菜单项", async () => {
    const { api } = installApi(getDefaultData(BASE_TIME));
    delete api.copyToClipboard;
    Object.defineProperty(window, "ideaNotes", {
      configurable: true,
      value: api,
    });
    const user = userEvent.setup();

    render(<App />);

    const title = await screen.findByText("重构 Desktop App 导航栏");
    const card = title.closest("article") as HTMLElement;
    await user.click(within(card).getByRole("button", { name: "更多操作" }));
    const menu = screen.getByRole("menu", { name: "更多操作" });
    const copyTitle = within(menu).getByRole("menuitem", { name: "复制标题" });
    const copyBody = within(menu).getByRole("menuitem", { name: "复制正文" });

    expect((copyTitle as HTMLButtonElement).disabled).toBe(true);
    expect((copyBody as HTMLButtonElement).disabled).toBe(true);
    await user.click(copyTitle);

    expect(api.copyToClipboard).toBeUndefined();
  });

  it("更多操作菜单指针点击复制标题时在菜单关闭前写入剪贴板", async () => {
    const { api } = installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    const title = await screen.findByText("重构 Desktop App 导航栏");
    const card = title.closest("article") as HTMLElement;
    await user.click(within(card).getByRole("button", { name: "更多操作" }));
    const menu = screen.getByRole("menu", { name: "更多操作" });
    const copyTitle = within(menu).getByRole("menuitem", { name: "复制标题" });

    fireEvent.pointerUp(copyTitle);

    expect(api.copyToClipboard).toHaveBeenCalledWith("重构 Desktop App 导航栏");
  });

  it("更多操作菜单点击各动作时执行对应命令", async () => {
    const { api, saved } = installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    const openMenuItem = async (label: string): Promise<HTMLButtonElement> => {
      const title = await screen.findByText("重构 Desktop App 导航栏");
      const card = title.closest("article") as HTMLElement;
      await user.click(within(card).getByRole("button", { name: "更多操作" }));
      const menu = screen.getByRole("menu", { name: "更多操作" });
      return within(menu).getByRole("menuitem", { name: label }) as HTMLButtonElement;
    };

    await user.click(await openMenuItem("置顶"));
    await waitFor(() => expect(api.saveData).toHaveBeenCalledTimes(1));
    expect(saved.at(-1)?.notes[0]?.pinned).toBe(true);

    await user.click(await openMenuItem("编辑"));
    expect(screen.getByRole("heading", { name: "编辑笔记" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "取消" }));

    await user.click(await openMenuItem("完成"));
    await waitFor(() => expect(api.saveData).toHaveBeenCalledTimes(2));
    expect(saved.at(-1)?.notes[0]?.status).toBe("completed");
    const nav = screen.getByRole("navigation", { name: "笔记视图" });
    await user.click(within(nav).getByRole("button", { name: /已完成/ }));
    const completedCard = (await screen.findByText("重构 Desktop App 导航栏")).closest(
      "article",
    ) as HTMLElement;
    await user.click(within(completedCard).getByRole("button", { name: "更多操作" }));
    await user.click(
      within(screen.getByRole("menu", { name: "更多操作" })).getByRole("menuitem", {
        name: "恢复",
      }),
    );
    await waitFor(() => expect(api.saveData).toHaveBeenCalledTimes(3));
    await user.click(within(nav).getByRole("button", { name: /进行中/ }));

    await user.click(await openMenuItem("归档"));
    await waitFor(() => expect(api.saveData).toHaveBeenCalledTimes(4));
    expect(saved.at(-1)?.notes[0]?.status).toBe("archive");
    await user.click(within(nav).getByRole("button", { name: /归档/ }));
    const archivedCard = (await screen.findByText("重构 Desktop App 导航栏")).closest(
      "article",
    ) as HTMLElement;
    await user.click(within(archivedCard).getByRole("button", { name: "更多操作" }));
    await user.click(
      within(screen.getByRole("menu", { name: "更多操作" })).getByRole("menuitem", {
        name: "恢复",
      }),
    );
    await waitFor(() => expect(api.saveData).toHaveBeenCalledTimes(5));

    await user.click(await openMenuItem("复制"));
    await waitFor(() => expect(api.saveData).toHaveBeenCalledTimes(6));
    expect(saved.at(-1)?.notes[0]?.title).toBe("重构 Desktop App 导航栏 副本");

    await user.click(await openMenuItem("删除"));
    await waitFor(() => expect(api.saveData).toHaveBeenCalledTimes(7));
    expect(
      saved.at(-1)?.notes.find((note) => note.id === "seed-navigation")?.status,
    ).toBe("trash");
  });

  it("更多操作菜单复制正文到剪贴板", async () => {
    const { api } = installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    const title = await screen.findByText("重构 Desktop App 导航栏");
    const card = title.closest("article") as HTMLElement;
    await user.click(within(card).getByRole("button", { name: "更多操作" }));
    const menu = screen.getByRole("menu", { name: "更多操作" });
    const copyBody = within(menu).getByRole("menuitem", { name: "复制正文" });

    expect((copyBody as HTMLButtonElement).disabled).toBe(false);
    await user.click(copyBody);

    expect(api.copyToClipboard).toHaveBeenCalledTimes(1);
    expect(api.copyToClipboard).toHaveBeenCalledWith(
      "实现可拖拽的 Titlebar\n添加窗口控制\n增加置顶按钮\n修复深色模式图标对比度",
    );
  });

  it("正文为空时更多操作菜单禁用复制正文但保留复制标题", async () => {
    const data = getDefaultData(BASE_TIME);
    data.notes = [{ ...data.notes[0], body: "" }, data.notes[1]];
    const { api } = installApi(data);
    const user = userEvent.setup();

    render(<App />);

    const title = await screen.findByText("重构 Desktop App 导航栏");
    const card = title.closest("article") as HTMLElement;
    await user.click(within(card).getByRole("button", { name: "更多操作" }));
    const menu = screen.getByRole("menu", { name: "更多操作" });
    const copyTitle = within(menu).getByRole("menuitem", { name: "复制标题" });
    const copyBody = within(menu).getByRole("menuitem", { name: "复制正文" });

    expect((copyTitle as HTMLButtonElement).disabled).toBe(false);
    expect((copyBody as HTMLButtonElement).disabled).toBe(true);
    await user.click(copyBody);

    expect(api.copyToClipboard).not.toHaveBeenCalled();
  });

  it("置顶笔记显示置顶图标，非置顶笔记不显示", async () => {
    const data = getDefaultData(BASE_TIME);
    data.notes = [
      { ...data.notes[0], pinned: true },
      { ...data.notes[1], pinned: false },
    ];
    installApi(data);

    render(<App />);

    const pinnedCard = (await screen.findByText("重构 Desktop App 导航栏")).closest(
      "article",
    ) as HTMLElement;
    const unpinnedCard = screen
      .getByText("产品命名灵感")
      .closest("article") as HTMLElement;
    expect(within(pinnedCard).getByLabelText("置顶")).toBeTruthy();
    expect(within(unpinnedCard).queryByLabelText("置顶")).toBeNull();
  });

  it("更多操作菜单在编辑项前切换置顶状态并通过既有排序更新列表", async () => {
    const { api, saved } = installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();
    const { container } = render(<App />);

    const title = await screen.findByText("产品命名灵感");
    const card = title.closest("article") as HTMLElement;
    await user.click(within(card).getByRole("button", { name: "更多操作" }));
    let menu = screen.getByRole("menu", { name: "更多操作" });
    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent),
    ).toEqual(["置顶", "编辑", "完成", "归档", "复制", "复制标题", "复制正文", "删除"]);

    await user.click(within(menu).getByRole("menuitem", { name: "置顶" }));

    await waitFor(() => expect(api.saveData).toHaveBeenCalledTimes(1));
    expect(saved.at(-1)?.notes.find((note) => note.id === "seed-naming")?.pinned).toBe(
      true,
    );
    await waitFor(() => {
      const articles = Array.from(container.querySelectorAll("article"));
      expect(within(articles[0] as HTMLElement).getByText("产品命名灵感")).toBeTruthy();
    });

    const pinnedCard = screen
      .getByText("产品命名灵感")
      .closest("article") as HTMLElement;
    await user.click(within(pinnedCard).getByRole("button", { name: "更多操作" }));
    menu = screen.getByRole("menu", { name: "更多操作" });
    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent),
    ).toEqual([
      "取消置顶",
      "编辑",
      "完成",
      "归档",
      "复制",
      "复制标题",
      "复制正文",
      "删除",
    ]);

    await user.click(within(menu).getByRole("menuitem", { name: "取消置顶" }));

    await waitFor(() => expect(api.saveData).toHaveBeenCalledTimes(2));
    expect(saved.at(-1)?.notes.find((note) => note.id === "seed-naming")?.pinned).toBe(
      false,
    );
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
    expect(within(menu).getByRole("menuitem", { name: "复制标题" })).toBeTruthy();
    expect(within(menu).queryByRole("menuitem", { name: "复制" })).toBeNull();
    expect(within(menu).queryByRole("menuitem", { name: "复制正文" })).toBeNull();
  });

  it("已完成笔记更多操作菜单仍可复制标题", async () => {
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
    const card = title.closest("article") as HTMLElement;
    await user.click(within(card).getByRole("button", { name: "更多操作" }));
    const menu = screen.getByRole("menu", { name: "更多操作" });
    const copyTitle = within(menu).getByRole("menuitem", { name: "复制标题" });

    expect((copyTitle as HTMLButtonElement).disabled).toBe(false);
    await user.click(copyTitle);

    expect(api.copyToClipboard).toHaveBeenCalledTimes(1);
    expect(api.copyToClipboard).toHaveBeenCalledWith("重构 Desktop App 导航栏");
  });

  it("回收站笔记更多操作菜单不展示置顶或取消置顶", async () => {
    const trashData = getDefaultData(BASE_TIME);
    trashData.notes = [
      {
        ...trashData.notes[0],
        pinned: true,
        status: "trash",
        trashedAt: Date.parse("2026-05-29T09:00:00.000Z"),
      },
      trashData.notes[1],
    ];
    installApi(trashData);
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: /回收站/ }));
    const trashCard = (await screen.findByText("重构 Desktop App 导航栏")).closest(
      "article",
    ) as HTMLElement;
    await user.click(within(trashCard).getByRole("button", { name: "更多操作" }));
    const menu = screen.getByRole("menu", { name: "更多操作" });

    expect(within(menu).queryByRole("menuitem", { name: "置顶" })).toBeNull();
    expect(within(menu).queryByRole("menuitem", { name: "取消置顶" })).toBeNull();
  });

  it("可以归档进行中笔记，并从归档区恢复到进行中", async () => {
    const { api, saved } = installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    const title = await screen.findByText("重构 Desktop App 导航栏");
    const card = title.closest("article") as HTMLElement;
    await user.click(within(card).getByRole("button", { name: "归档" }));

    await waitFor(() => expect(api.saveData).toHaveBeenCalledTimes(1));
    expect(saved.at(-1)?.notes[0]?.status).toBe("archive");
    const nav = screen.getByRole("navigation", { name: "笔记视图" });
    await user.click(within(nav).getByRole("button", { name: /归档/ }));
    const archivedCard = (await screen.findByText("重构 Desktop App 导航栏")).closest(
      "article",
    ) as HTMLElement;
    expect(within(archivedCard).getByText(/状态：归档/)).toBeTruthy();
    expect(within(archivedCard).getByRole("button", { name: "恢复" })).toBeTruthy();
    expect(within(archivedCard).getByRole("button", { name: "删除" })).toBeTruthy();
    expect(within(archivedCard).queryByRole("button", { name: "完成" })).toBeNull();

    await user.click(within(archivedCard).getByRole("button", { name: "恢复" }));

    await waitFor(() => expect(api.saveData).toHaveBeenCalledTimes(2));
    expect(saved.at(-1)?.notes[0]?.status).toBe("active");
  });
});
