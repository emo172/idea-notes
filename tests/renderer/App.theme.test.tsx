/** @vitest-environment jsdom */
// React 渲染层测试。
// 作用：
// 1. 使用 jsdom 模拟浏览器环境，避免启动真实 Electron 窗口。
// 2. 用假的 window.ideaNotes 验证 App 会从 preload API 加载数据。
// 3. 按功能域拆分测试，避免单个文件过大。
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import {
  BASE_TIME,
  RENDERER_SRC,
  installApi,
  readCssRuleBlock,
  readRendererStyles,
} from "./testUtils";

describe("App theme and style contracts", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("暗色主题通过 token 提供更深背景和完整按钮状态色", () => {
    const styles = readRendererStyles();
    const darkBlock = readCssRuleBlock(styles, ".app-window.dark");
    const darkButtonHoverBlock = readCssRuleBlock(
      styles,
      ".app-window.dark .app-button:hover,\n.app-window.dark .app-button.active",
    );
    const darkPrimaryBlock = readCssRuleBlock(
      styles,
      ".app-window.dark .app-button-variant-primary",
    );
    const darkPrimaryHoverBlock = readCssRuleBlock(
      styles,
      ".app-window.dark .app-button-variant-primary:hover",
    );

    expect(darkBlock).toContain("--bg: #050816;");
    expect(darkBlock).toContain("--surface: #0d1424;");
    expect(darkBlock).toContain("--surface-warm: #111c33;");
    expect(darkBlock).toContain("--button-bg: #121c31;");
    expect(darkBlock).toContain("--button-border: #2a3a57;");
    expect(darkBlock).toContain(
      "--button-shadow: 0 1px 2px rgba(0, 0, 0, 0.28);",
    );
    expect(darkBlock).toContain(
      "--button-hover-shadow: 0 10px 22px rgba(0, 0, 0, 0.34);",
    );
    expect(darkButtonHoverBlock).toContain("--button-bg: #19243b;");
    expect(darkButtonHoverBlock).toContain("--button-border: #3b4d6d;");
    expect(darkPrimaryBlock).toContain("--button-bg: #ff7a1a;");
    expect(darkPrimaryBlock).toContain("--button-border: #ff9a4d;");
    expect(darkPrimaryBlock).toContain("color: #111827;");
    expect(darkPrimaryHoverBlock).toContain("--button-bg: #ff8f3d;");
  });

  it("暗色模式默认背景不以内联样式覆盖根主题背景", async () => {
    const darkData = getDefaultData(BASE_TIME);
    darkData.settings = {
      ...darkData.settings,
      themeMode: "dark",
    };
    installApi(darkData);

    const { container } = render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");
    const appWindow = container.querySelector(
      ".app-window.dark",
    ) as HTMLElement;
    expect(appWindow).toBeTruthy();
    expect(appWindow.style.backgroundColor).toBe("");
  });

  it("暗色模式的笔记状态页面忽略自定义浅色背景", async () => {
    const darkData = getDefaultData(BASE_TIME);
    darkData.settings = {
      ...darkData.settings,
      themeMode: "dark",
      backgroundColor: "#ffffff",
    };
    darkData.notes = [
      {
        ...darkData.notes[0],
        id: "dark-active-note",
        title: "深色进行中背景",
        status: "active",
      },
      {
        ...darkData.notes[0],
        id: "dark-completed-note",
        title: "深色已完成背景",
        status: "completed",
      },
      {
        ...darkData.notes[0],
        id: "dark-trash-note",
        title: "深色回收站背景",
        status: "trash",
        trashedAt: BASE_TIME,
      },
    ];
    installApi(darkData);
    const user = userEvent.setup();

    const { container } = render(<App />);

    await screen.findByText("深色进行中背景");
    const appWindow = container.querySelector(
      ".app-window.dark",
    ) as HTMLElement;
    expect(appWindow).toBeTruthy();
    expect(appWindow.style.backgroundColor).toBe("");

    await user.click(screen.getByRole("button", { name: /已完成/ }));
    await screen.findByText("深色已完成背景");
    expect(appWindow.style.backgroundColor).toBe("");

    await user.click(screen.getByRole("button", { name: /回收站/ }));
    await screen.findByText("深色回收站背景");
    expect(appWindow.style.backgroundColor).toBe("");
  });

  it("浅色模式继续允许自定义背景以内联样式覆盖", async () => {
    const lightData = getDefaultData(BASE_TIME);
    lightData.settings = {
      ...lightData.settings,
      backgroundColor: "#102030",
    };
    installApi(lightData);

    const { container } = render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");
    const appWindow = container.querySelector(".app-window") as HTMLElement;
    expect(appWindow).toBeTruthy();
    expect(appWindow.classList.contains("dark")).toBe(false);
    expect(appWindow.style.backgroundColor).toBe("rgb(16, 32, 48)");
  });

  it("渲染层样式入口拆分为按职责维护的目录文件", () => {
    const styleEntry = readFileSync(
      resolve(RENDERER_SRC, "styles.css"),
      "utf8",
    );
    const styleFiles = [
      "base.css",
      "buttons.css",
      "dropdown.css",
      "layout.css",
      "sidebar.css",
      "toolbar.css",
      "notes.css",
      "dialogs.css",
      "editor.css",
      "settings.css",
    ];

    for (const file of styleFiles) {
      expect(existsSync(resolve(RENDERER_SRC, "styles", file))).toBe(true);
      expect(styleEntry).toContain(`@import "./styles/${file}";`);
    }

    expect(styleEntry).not.toContain(".note-card {");
    expect(styleEntry).not.toContain(".settings-view {");
  });

  it("下拉按钮和菜单组件按 ui 子目录独立维护", () => {
    const dropdownDir = resolve(RENDERER_SRC, "components/ui/dropdown");
    const styleEntry = readFileSync(
      resolve(RENDERER_SRC, "styles.css"),
      "utf8",
    );
    const dropdownStyles = readFileSync(
      resolve(RENDERER_SRC, "styles/dropdown.css"),
      "utf8",
    );

    expect(existsSync(resolve(dropdownDir, "DropdownButton.tsx"))).toBe(true);
    expect(existsSync(resolve(dropdownDir, "DropdownMenu.tsx"))).toBe(true);
    expect(styleEntry).toContain('@import "./styles/dropdown.css";');
    expect(dropdownStyles).toContain(".dropdown-anchor");
    expect(dropdownStyles).toContain(".dropdown-menu");
    expect(dropdownStyles).toContain(".dropdown-menu button:hover");
  });

  it("拆分后的样式模块不混入其他页面职责", () => {
    const sidebarStyles = readFileSync(
      resolve(RENDERER_SRC, "styles/sidebar.css"),
      "utf8",
    );
    const toolbarStyles = readFileSync(
      resolve(RENDERER_SRC, "styles/toolbar.css"),
      "utf8",
    );
    const noteStyles = readFileSync(
      resolve(RENDERER_SRC, "styles/notes.css"),
      "utf8",
    );
    const editorStyles = readFileSync(
      resolve(RENDERER_SRC, "styles/editor.css"),
      "utf8",
    );

    expect(sidebarStyles).not.toContain(".notes-list");
    expect(sidebarStyles).not.toContain(".tag-picker");
    expect(sidebarStyles).not.toContain(".tag-manager-list");
    expect(toolbarStyles).not.toContain(".form-field");
    expect(toolbarStyles).not.toContain(".setting-row");
    expect(noteStyles).not.toContain(".settings-actions");
    expect(noteStyles).not.toContain(".editor-head");
    expect(noteStyles).not.toContain(".tag-add-row");
    expect(editorStyles).not.toContain(".settings-head");
    expect(editorStyles).not.toContain(".settings-main");
  });

  it("笔记卡片清单预览使用紧凑行距", () => {
    // 卡片预览的视觉密度由职责样式文件锁定，避免组件测试依赖浏览器布局实现。
    const noteStyles = readFileSync(
      resolve(RENDERER_SRC, "styles/notes.css"),
      "utf8",
    );
    const checklistPreviewBlock =
      noteStyles.match(/\.checklist-preview\s*\{[^}]*\}/)?.[0] ?? "";
    const checkItemBlock =
      noteStyles.match(/\.check-item\s*\{[^}]*\}/)?.[0] ?? "";
    const checkItemCheckboxBlock =
      noteStyles.match(
        /\.check-item input\[type="checkbox"\]\s*\{[^}]*\}/,
      )?.[0] ?? "";

    expect(checklistPreviewBlock).toContain("gap: 4px;");
    expect(checkItemBlock).toContain("line-height: 1.25;");
    expect(checkItemCheckboxBlock).toContain("width: 16px;");
    expect(checkItemCheckboxBlock).toContain("height: 16px;");
    expect(checkItemCheckboxBlock).toContain("min-height: 0;");
  });

  it("笔记卡片分段进度条使用不同状态色", () => {
    const noteStyles = readFileSync(
      resolve(RENDERER_SRC, "styles/notes.css"),
      "utf8",
    );
    const containerBlock = readCssRuleBlock(
      noteStyles,
      ".progress-bar-container",
    );
    const completedSegmentBlock = readCssRuleBlock(
      noteStyles,
      ".progress-bar-segment.completed",
    );
    const pendingSegmentBlock = readCssRuleBlock(
      noteStyles,
      ".progress-bar-segment.pending",
    );

    expect(containerBlock).toContain("gap: 2px;");
    expect(containerBlock).toContain("background: var(--surface);");
    expect(completedSegmentBlock).toContain("background: var(--success);");
    expect(pendingSegmentBlock).toContain("background: var(--border);");
    expect(containerBlock).not.toContain("background: var(--border);");
    expect(containerBlock).not.toBe(pendingSegmentBlock);
    expect(completedSegmentBlock).not.toBe(pendingSegmentBlock);
  });

  it("笔记卡片和优先级下拉菜单在浅色和深色模式下使用独立状态色", () => {
    const baseStyles = readFileSync(
      resolve(RENDERER_SRC, "styles/base.css"),
      "utf8",
    );
    const toolbarStyles = readFileSync(
      resolve(RENDERER_SRC, "styles/toolbar.css"),
      "utf8",
    );
    const noteStyles = readFileSync(
      resolve(RENDERER_SRC, "styles/notes.css"),
      "utf8",
    );
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
    const mediumLabelBlock = readCssRuleBlock(
      noteStyles,
      ".priority-label.medium",
    );
    const lowLabelBlock = readCssRuleBlock(noteStyles, ".priority-label.low");
    const overdueCardBlock = readCssRuleBlock(
      noteStyles,
      ".note-card.deadline-overdue",
    );
    const pendingCardBlock = readCssRuleBlock(
      noteStyles,
      ".note-card.deadline-pending",
    );
    const overdueStatusBlock = readCssRuleBlock(
      noteStyles,
      ".deadline-status.overdue",
    );
    const pendingStatusBlock = readCssRuleBlock(
      noteStyles,
      ".deadline-status.pending",
    );
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
    expect(noteCardBlock).toContain(
      "border: 1px solid var(--note-card-border);",
    );
    expect(noteCardBlock).toContain(
      "border-left: 4px solid var(--note-priority-color);",
    );
    expect(noteCardBlock).toContain("background: var(--note-card-bg);");
    expect(highCardBlock).toContain(
      "--note-priority-color: var(--priority-high);",
    );
    expect(mediumCardBlock).toContain(
      "--note-priority-color: var(--priority-medium);",
    );
    expect(lowCardBlock).toContain(
      "--note-priority-color: var(--priority-low);",
    );
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
    expect(overdueStatusBlock).toContain(
      "color: var(--deadline-status-color);",
    );
    expect(pendingStatusBlock).toContain(
      "color: var(--deadline-status-color);",
    );
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
        toolbarPrioritySelect.querySelectorAll(
          'option[value]:not([value="all"])',
        ),
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
