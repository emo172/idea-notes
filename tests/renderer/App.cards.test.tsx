/** @vitest-environment jsdom */
// React 渲染层测试。
// 作用：
// 1. 使用 jsdom 模拟浏览器环境，避免启动真实 Electron 窗口。
// 2. 用假的 window.ideaNotes 验证 App 会从 preload API 加载数据。
// 3. 按功能域拆分测试，避免单个文件过大。
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import type { IdeaNotesData } from "@shared/types";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { BASE_TIME, installApi } from "./testUtils";

describe("App note cards", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("复制笔记并把本地化副本插入列表顶部", async () => {
    const { api, saved } = installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");
    await user.click(screen.getAllByRole("button", { name: "更多操作" })[0]);
    await user.click(screen.getByRole("menuitem", { name: "复制" }));

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    expect(saved.at(-1)?.notes[0]?.title).toBe("重构 Desktop App 导航栏 副本");
    expect(saved.at(-1)?.notes[1]?.title).toBe("重构 Desktop App 导航栏");
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

  it("保存进行中再次触发卡片保存动作时显示忙碌提示", async () => {
    const { api } = installApi(getDefaultData(BASE_TIME));
    let resolveSave: ((data: IdeaNotesData) => void) | undefined;
    api.saveData = vi.fn(
      (nextData) =>
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
    expect(screen.getByRole("alert").textContent).toBe(
      "正在保存，请稍后再试。",
    );

    const finishSave = resolveSave;
    if (!finishSave) throw new Error("save promise was not created");
    await act(async () => {
      finishSave(getDefaultData(BASE_TIME));
    });
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  it.each([
    {
      language: "en" as const,
      title: "Desktop App navigation",
      moreActions: "More actions",
      duplicate: "Copy",
      expectedTitle: "Desktop App navigation Copy",
    },
    {
      language: "zh-TW" as const,
      title: "測試筆記",
      moreActions: "更多操作",
      duplicate: "複製",
      expectedTitle: "測試筆記 複本",
    },
  ])(
    "$language 复制笔记使用当前语言标题后缀",
    async ({ language, title, moreActions, duplicate, expectedTitle }) => {
      const data = getDefaultData(BASE_TIME);
      data.settings.language = language;
      data.notes = [
        {
          ...data.notes[0],
          id: `${language}-copy-source`,
          title,
        },
      ];
      const { api, saved } = installApi(data);
      const user = userEvent.setup();

      render(<App />);

      await screen.findByText(title);
      await user.click(screen.getByRole("button", { name: moreActions }));
      await user.click(screen.getByRole("menuitem", { name: duplicate }));

      await waitFor(() => expect(api.saveData).toHaveBeenCalled());
      expect(saved.at(-1)?.notes[0]?.title).toBe(expectedTitle);
    },
  );

  it.each([
    {
      label: "简体中文",
      language: "zh-CN" as const,
      restoreLabel: "恢复",
      previousRestoreLabel: "重新进行",
      deleteLabel: "删除",
      permanentDeleteLabel: "彻底删除",
      dialogTitle: "确认彻底删除？",
      confirmLabel: "确认",
      previousConfirmLabel: "确认删除",
    },
    {
      label: "繁体中文",
      language: "zh-TW" as const,
      restoreLabel: "恢復",
      previousRestoreLabel: "重新進行",
      deleteLabel: "刪除",
      permanentDeleteLabel: "永久刪除",
      dialogTitle: "確認永久刪除？",
      confirmLabel: "確認",
      previousConfirmLabel: "確認刪除",
    },
  ])(
    "$label已完成和回收站页面按钮文案保持两个汉字",
    async ({
      language,
      restoreLabel,
      previousRestoreLabel,
      deleteLabel,
      permanentDeleteLabel,
      dialogTitle,
      confirmLabel,
      previousConfirmLabel,
    }) => {
      const data = getDefaultData(BASE_TIME);
      data.settings.language = language;
      data.notes = [
        {
          ...data.notes[0],
          id: "completed-note",
          title: "测试笔记 A",
          status: "completed",
        },
        {
          ...data.notes[1],
          id: "trash-note",
          title: "测试笔记 B",
          status: "trash",
          trashedAt: Date.parse("2026-05-29T09:00:00.000Z"),
        },
      ];
      installApi(data);
      const user = userEvent.setup();

      render(<App />);

      await user.click(await screen.findByRole("button", { name: /已完成/ }));
      await screen.findByRole("button", { name: restoreLabel });
      expect(
        screen.queryByRole("button", { name: previousRestoreLabel }),
      ).toBeNull();

      await user.click(screen.getByRole("button", { name: /回收站/ }));
      const deleteButton = await screen.findByRole("button", {
        name: deleteLabel,
      });
      expect(
        screen.queryByRole("button", { name: permanentDeleteLabel }),
      ).toBeNull();
      await user.click(deleteButton);
      const dialog = await screen.findByRole("dialog", {
        name: dialogTitle,
      });
      within(dialog).getByRole("button", { name: confirmLabel });
      expect(
        within(dialog).queryByRole("button", { name: previousConfirmLabel }),
      ).toBeNull();
    },
  );

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

  it("笔记卡片按原型避免正文和清单重复", async () => {
    installApi(getDefaultData(BASE_TIME));

    render(<App />);

    const checklistTitle = await screen.findByText("重构 Desktop App 导航栏");
    const checklistCard = checklistTitle.closest("article");
    expect(checklistCard).toBeTruthy();
    expect(
      (checklistCard as HTMLElement).querySelector(".note-body-preview"),
    ).toBeNull();
    expect(
      within(checklistCard as HTMLElement).getByText("实现可拖拽的 Titlebar"),
    ).toBeTruthy();

    const bodyTitle = screen.getByText("产品命名灵感");
    const bodyCard = bodyTitle.closest("article");
    expect(bodyCard).toBeTruthy();
    const bodyPreview = (bodyCard as HTMLElement).querySelector(
      ".note-body-preview",
    );
    expect(bodyPreview?.textContent).toContain("Idea Notes");
  });

  it("笔记卡片按原型展示完成进度、分段进度条、正文背景和优先级位置", async () => {
    installApi(getDefaultData(BASE_TIME));

    render(<App />);

    const checklistTitle = await screen.findByText("重构 Desktop App 导航栏");
    const checklistCard = checklistTitle.closest("article") as HTMLElement;
    // 原型要求优先级进入 meta 区，卡片标题区只保留编辑和更多操作。
    const checklistMeta = checklistCard.querySelector(".note-meta");
    expect(checklistMeta).toBeTruthy();
    expect(
      within(checklistMeta as HTMLElement).getByText("优先级：重要"),
    ).toBeTruthy();
    expect(
      checklistCard.querySelector(".note-header-actions .priority-label"),
    ).toBeNull();
    expect(
      checklistCard.querySelector(".note-content-preview .checklist-preview"),
    ).toBeTruthy();
    expect(
      checklistCard.querySelector(".completion-summary")?.textContent,
    ).toBe("完成进度：2/4");
    expect(
      Array.from(
        checklistCard.querySelectorAll(".progress-bar-segment"),
        (segment) => segment.className,
      ),
    ).toEqual([
      "progress-bar-segment completed",
      "progress-bar-segment completed",
      "progress-bar-segment pending",
      "progress-bar-segment pending",
    ]);

    const bodyTitle = screen.getByText("产品命名灵感");
    const bodyCard = bodyTitle.closest("article") as HTMLElement;
    expect(
      bodyCard.querySelector(".note-content-preview .note-body-preview"),
    ).toBeTruthy();
  });

  it("笔记卡片根据当前时间展示已截止和未截止状态", async () => {
    const now = BASE_TIME;
    const data = getDefaultData(now);
    data.notes = [
      {
        ...data.notes[0],
        id: "deadline-overdue-note",
        title: "已经超过截止时间",
        dueAt: "2026-05-28T18:00",
      },
      {
        ...data.notes[1],
        id: "deadline-pending-note",
        title: "还没到截止时间",
        dueAt: "2026-05-30T18:00",
      },
      {
        ...data.notes[1],
        id: "deadline-empty-note",
        title: "未设置截止时间的笔记",
        dueAt: undefined,
      },
    ];
    vi.spyOn(Date, "now").mockReturnValue(now);
    installApi(data);

    render(<App />);

    const overdueTitle = await screen.findByText("已经超过截止时间");
    const overdueCard = overdueTitle.closest("article") as HTMLElement;
    const pendingCard = screen
      .getByText("还没到截止时间")
      .closest("article") as HTMLElement;
    const emptyCard = screen
      .getByText("未设置截止时间的笔记")
      .closest("article") as HTMLElement;

    expect(overdueCard.classList.contains("deadline-overdue")).toBe(true);
    expect(
      overdueCard.querySelector(".deadline-status.overdue")?.textContent,
    ).toBe("已截止");
    expect(pendingCard.classList.contains("deadline-pending")).toBe(true);
    expect(
      pendingCard.querySelector(".deadline-status.pending")?.textContent,
    ).toBe("未截止");
    expect(emptyCard.querySelector(".deadline-status")).toBeNull();
  });

  it("无截止时间的笔记卡片显示空截止文案且不回退到更新时间", async () => {
    const updatedAt = Date.parse("2026-05-25T10:30:00.000Z");
    const data = getDefaultData(BASE_TIME);
    data.notes = [
      {
        ...data.notes[1],
        id: "note-without-due-date",
        title: "没有截止时间的卡片",
        dueAt: undefined,
        updatedAt,
      },
    ];
    const formattedUpdatedAt = new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(updatedAt));
    installApi(data);

    render(<App />);

    const title = await screen.findByText("没有截止时间的卡片");
    const card = title.closest("article") as HTMLElement;
    const meta = card.querySelector(".note-meta") as HTMLElement;

    expect(meta.textContent).toContain("截止时间：未设置截止时间");
    expect(meta.textContent).not.toContain(`截止时间：${formattedUpdatedAt}`);
  });

  it("笔记卡片状态和截止时间标签显示图标", async () => {
    installApi(getDefaultData(BASE_TIME));

    render(<App />);

    const title = await screen.findByText("重构 Desktop App 导航栏");
    const card = title.closest("article");
    expect(card).toBeTruthy();
    const meta = (card as HTMLElement).querySelector(".note-meta");
    expect(meta).toBeTruthy();

    expect(within(meta as HTMLElement).getByText(/状态：进行中/)).toBeTruthy();
    expect(
      within(meta as HTMLElement).getByText(/截止时间：2026年5月24日/),
    ).toBeTruthy();
    expect((meta as HTMLElement).querySelectorAll("svg")).toHaveLength(2);
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
    expect(saved.at(-1)?.notes.map((note) => note.id)).not.toContain(
      "seed-navigation",
    );
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
    expect(
      screen.queryByRole("dialog", { name: clearTrashDialogName }),
    ).toBeNull();
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
    expect(
      screen.getByRole("dialog", { name: clearTrashDialogName }),
    ).toBeTruthy();
    expect(screen.getByText("重构 Desktop App 导航栏")).toBeTruthy();
    expect(screen.getByText("产品命名灵感")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe(
      "保存失败，本地数据没有写入。请重试。",
    );
  });
});
