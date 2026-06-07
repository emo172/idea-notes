/** @vitest-environment jsdom */
// React 渲染层截止状态和优先级样式测试。
// 作用：
// 1. 锁定笔记卡片优先级和截止状态使用独立 token。
// 2. 覆盖优先级下拉菜单选项的颜色类。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { BASE_TIME, RENDERER_SRC, installApi, readCssRuleBlock } from "./testUtils";

describe("App deadline and priority styles", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("笔记卡片和优先级下拉菜单在浅色和深色模式下使用独立状态色", () => {
    const baseStyles = readFileSync(resolve(RENDERER_SRC, "styles/base.css"), "utf8");
    const toolbarStyles = readFileSync(
      resolve(RENDERER_SRC, "styles/toolbar.css"),
      "utf8",
    );
    const noteStyles = [
      readFileSync(resolve(RENDERER_SRC, "styles/note-card.css"), "utf8"),
      readFileSync(resolve(RENDERER_SRC, "styles/note-card-meta.css"), "utf8"),
    ].join("\n");
    const rootBlock = readCssRuleBlock(baseStyles, ":root");
    const darkBlock = readCssRuleBlock(baseStyles, ".app-window.dark");
    const noteCardBlock = readCssRuleBlock(noteStyles, ".note-card");
    const highCardBlock = readCssRuleBlock(noteStyles, ".priority-high");
    const mediumCardBlock = readCssRuleBlock(noteStyles, ".priority-medium");
    const lowCardBlock = readCssRuleBlock(noteStyles, ".priority-low");
    const highOptionBlock = readCssRuleBlock(
      toolbarStyles,
      ".priority-select option.priority-option-high",
    );
    const mediumOptionBlock = readCssRuleBlock(
      toolbarStyles,
      ".priority-select option.priority-option-medium",
    );
    const lowOptionBlock = readCssRuleBlock(
      toolbarStyles,
      ".priority-select option.priority-option-low",
    );
    const highLabelBlock = readCssRuleBlock(noteStyles, ".priority-label.high");
    const mediumLabelBlock = readCssRuleBlock(noteStyles, ".priority-label.medium");
    const lowLabelBlock = readCssRuleBlock(noteStyles, ".priority-label.low");
    const overdueCardBlock = readCssRuleBlock(
      noteStyles,
      ".note-card.deadline-overdue",
    );
    const pendingCardBlock = readCssRuleBlock(
      noteStyles,
      ".note-card.deadline-pending",
    );
    const overdueStatusBlock = readCssRuleBlock(noteStyles, ".deadline-status.overdue");
    const pendingStatusBlock = readCssRuleBlock(noteStyles, ".deadline-status.pending");
    const darkOverdueCardBlock = readCssRuleBlock(
      noteStyles,
      ".app-window.dark .note-card.deadline-overdue",
    );
    const darkPendingCardBlock = readCssRuleBlock(
      noteStyles,
      ".app-window.dark .note-card.deadline-pending",
    );

    expect(rootBlock).toContain("--priority-high: #dc2626;");
    expect(rootBlock).toContain("--priority-medium: #d97706;");
    expect(rootBlock).toContain("--priority-low: #2563eb;");
    expect(rootBlock).toContain("--deadline-overdue-card-bg: color-mix(");
    expect(rootBlock).toContain("var(--danger),");
    expect(rootBlock).toContain("var(--surface) 92%");
    expect(rootBlock).toContain("--deadline-pending-card-bg: color-mix(");
    expect(rootBlock).toContain("var(--success),");
    expect(rootBlock).toContain("var(--surface) 94%");
    expect(rootBlock).toContain("--deadline-overdue-text: var(--danger);");
    expect(rootBlock).toContain("--deadline-pending-text: var(--success);");
    expect(darkBlock).toContain("--priority-high: #f87171;");
    expect(darkBlock).toContain("--priority-medium: #fbbf24;");
    expect(darkBlock).toContain("--priority-low: #60a5fa;");
    expect(darkBlock).toContain("--deadline-overdue-card-bg: #2b1118;");
    expect(darkBlock).toContain("--deadline-pending-card-bg: #10251a;");
    expect(darkBlock).toContain("--deadline-overdue-text: #fecaca;");
    expect(darkBlock).toContain("--deadline-pending-text: #bbf7d0;");
    expect(noteCardBlock).toContain("--note-card-bg: var(--surface);");
    expect(noteCardBlock).toContain("--note-card-border: var(--border);");
    expect(noteCardBlock).toContain("--note-priority-color: var(--muted);");
    expect(noteCardBlock).toContain("border: 1px solid var(--note-card-border);");
    expect(noteCardBlock).toContain(
      "border-left: 4px solid var(--note-priority-color);",
    );
    expect(noteCardBlock).toContain("background: var(--note-card-bg);");
    expect(highCardBlock).toContain("--note-priority-color: var(--priority-high);");
    expect(mediumCardBlock).toContain("--note-priority-color: var(--priority-medium);");
    expect(lowCardBlock).toContain("--note-priority-color: var(--priority-low);");
    expect(highOptionBlock).toContain("color: var(--priority-high);");
    expect(mediumOptionBlock).toContain("color: var(--priority-medium);");
    expect(lowOptionBlock).toContain("color: var(--priority-low);");
    expect(highLabelBlock).toContain("color: var(--priority-high);");
    expect(mediumLabelBlock).toContain("color: var(--priority-medium);");
    expect(lowLabelBlock).toContain("color: var(--priority-low);");
    expect(overdueCardBlock).toContain(
      "--note-card-bg: var(--deadline-overdue-card-bg);",
    );
    expect(pendingCardBlock).toContain(
      "--note-card-bg: var(--deadline-pending-card-bg);",
    );
    expect(overdueCardBlock).toContain("--note-card-border: color-mix(");
    expect(overdueCardBlock).toContain("var(--deadline-overdue-text),");
    expect(overdueCardBlock).toContain("var(--border) 60%");
    expect(pendingCardBlock).toContain("--note-card-border: color-mix(");
    expect(pendingCardBlock).toContain("var(--deadline-pending-text),");
    expect(pendingCardBlock).toContain("var(--border) 64%");
    expect(overdueCardBlock).toContain(
      "--deadline-status-color: var(--deadline-overdue-text);",
    );
    expect(pendingCardBlock).toContain(
      "--deadline-status-color: var(--deadline-pending-text);",
    );
    expect(overdueStatusBlock).toContain("color: var(--deadline-status-color);");
    expect(pendingStatusBlock).toContain("color: var(--deadline-status-color);");
    expect(overdueCardBlock).not.toContain("border-color:");
    expect(pendingCardBlock).not.toContain("border-color:");
    expect(darkOverdueCardBlock).toBe("");
    expect(darkPendingCardBlock).toBe("");
    expect(highCardBlock).not.toBe(mediumCardBlock);
    expect(mediumCardBlock).not.toBe(lowCardBlock);
    expect(highOptionBlock).not.toBe(mediumOptionBlock);
    expect(mediumOptionBlock).not.toBe(lowOptionBlock);
    expect(overdueCardBlock).not.toBe(pendingCardBlock);
    expect(overdueStatusBlock).not.toBe(pendingStatusBlock);
  });

  it("优先级下拉菜单用颜色类区分不同优先级", async () => {
    installApi(getDefaultData(BASE_TIME));
    const priorityClassNames = [
      "priority-option-high",
      "priority-option-medium",
      "priority-option-low",
    ];

    render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");
    const toolbarPrioritySelect = screen.getByLabelText("优先级");
    expect(
      Array.from(
        toolbarPrioritySelect.querySelectorAll('option[value]:not([value="all"])'),
        (option) => option.className,
      ),
    ).toEqual(priorityClassNames);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "新建" }));
    const editorPrioritySelect = screen.getAllByLabelText("优先级").at(-1);
    expect(editorPrioritySelect).toBeTruthy();
    expect(
      Array.from(
        (editorPrioritySelect as HTMLSelectElement).querySelectorAll("option"),
        (option) => option.className,
      ),
    ).toEqual(priorityClassNames);
  });
});
