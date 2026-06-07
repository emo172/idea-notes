/** @vitest-environment jsdom */
// React 渲染层卡片 meta 展示测试。
// 作用：
// 1. 覆盖卡片动作文案、完成进度、优先级位置和分段进度条。
// 2. 验证状态和截止时间 meta 标签使用图标展示。
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { BASE_TIME, installApi } from "./testUtils";

describe("App card meta", () => {
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
