/** @vitest-environment jsdom */
// React 渲染层卡片内容预览测试。
// 作用：
// 1. 覆盖正文和清单预览不会重复展示。
// 2. 验证搜索高亮和正文 HTML 安全展示。
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { BASE_TIME, installApi } from "./testUtils";

describe("App card content", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
});
