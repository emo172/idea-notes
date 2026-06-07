/** @vitest-environment jsdom */
// React 渲染层卡片截止时间测试。
// 作用：
// 1. 覆盖已截止、未截止和无截止时间的卡片状态。
// 2. 验证无截止时间不会回退展示更新时间。
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { BASE_TIME, installApi } from "./testUtils";

describe("App card deadline", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
});
