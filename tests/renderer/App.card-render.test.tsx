/** @vitest-environment jsdom */
// React 渲染层笔记卡片渲染测试。
// 作用：
// 1. 覆盖卡片内容、meta、进度、截止状态和按钮文案。
// 2. 锁定卡片结构与原型要求一致。
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { BASE_TIME, installApi } from "./testUtils";

describe("App card rendering", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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
      expect(screen.queryByRole("button", { name: previousRestoreLabel })).toBeNull();

      await user.click(screen.getByRole("button", { name: /回收站/ }));
      const deleteButton = await screen.findByRole("button", {
        name: deleteLabel,
      });
      expect(screen.queryByRole("button", { name: permanentDeleteLabel })).toBeNull();
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
    const bodyPreview = (bodyCard as HTMLElement).querySelector(".note-body-preview");
    expect(bodyPreview?.textContent).toContain("Idea Notes");
  });

  it("搜索命中时高亮标题和正文预览且不会执行用户 HTML", async () => {
    const data = getDefaultData(BASE_TIME);
    data.notes = [
      {
        ...data.notes[1],
        id: "highlight-body-note",
        title: "Idea 命名灵感",
        body: "Idea Notes <script>alert(1)</script>",
        tags: ["灵感"],
        checklist: [],
      },
    ];
    installApi(data);
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText("Idea 命名灵感");
    await user.type(screen.getByLabelText("搜索"), "Idea");

    const card = screen.getByText("命名灵感").closest("article") as HTMLElement;
    const highlights = within(card).getAllByText("Idea");
    const bodyPreview = card.querySelector(".note-body-preview") as HTMLElement;

    expect(highlights).toHaveLength(2);
    expect(
      highlights.every((item) => item.classList.contains("search-highlight")),
    ).toBe(true);
    expect(bodyPreview.textContent).toContain("Idea Notes <script>alert(1)</script>");
    expect(bodyPreview.querySelector("script")).toBeNull();
  });

  it("笔记卡片按原型展示完成进度、分段进度条、正文背景和优先级位置", async () => {
    installApi(getDefaultData(BASE_TIME));

    render(<App />);

    const checklistTitle = await screen.findByText("重构 Desktop App 导航栏");
    const checklistCard = checklistTitle.closest("article") as HTMLElement;
    // 原型要求优先级进入 meta 区，卡片标题区只保留编辑和更多操作。
    const checklistMeta = checklistCard.querySelector(".note-meta");
    expect(checklistMeta).toBeTruthy();
    expect(within(checklistMeta as HTMLElement).getByText("优先级：重要")).toBeTruthy();
    expect(
      checklistCard.querySelector(".note-header-actions .priority-label"),
    ).toBeNull();
    expect(
      checklistCard.querySelector(".note-content-preview .checklist-preview"),
    ).toBeTruthy();
    expect(checklistCard.querySelector(".completion-summary")?.textContent).toBe(
      "完成进度：2/4",
    );
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
    expect(overdueCard.querySelector(".deadline-status.overdue")?.textContent).toBe(
      "已截止",
    );
    expect(pendingCard.classList.contains("deadline-pending")).toBe(true);
    expect(pendingCard.querySelector(".deadline-status.pending")?.textContent).toBe(
      "未截止",
    );
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
});
