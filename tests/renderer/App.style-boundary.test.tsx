/** @vitest-environment jsdom */
// React 渲染层样式边界测试。
// 作用：
// 1. 锁定样式入口和按职责拆分的 CSS 文件。
// 2. 防止笔记、设置、编辑器等模块样式互相污染。
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { RENDERER_SRC, readCssRuleBlock } from "./testUtils";

const noteStyleFiles = [
  "notes-list.css",
  "note-card.css",
  "note-card-meta.css",
  "note-card-content.css",
  "note-card-tags.css",
  "checklist-preview.css",
  "note-actions.css",
] as const;

const dialogStyleFiles = ["dialogs.css", "shortcut-help.css"] as const;

const editorStyleFiles = [
  "editor-layout.css",
  "editor-main.css",
  "markdown-preview.css",
  "editor-side.css",
] as const;

const settingsStyleFiles = [
  "settings-view.css",
  "settings-tabs.css",
  "settings-form.css",
  "tag-manager.css",
] as const;

function readStyleFile(file: string): string {
  return readFileSync(resolve(RENDERER_SRC, "styles", file), "utf8");
}

describe("App style boundaries", () => {
  it("渲染层样式入口拆分为按职责维护的目录文件", () => {
    const styleEntry = readFileSync(resolve(RENDERER_SRC, "styles.css"), "utf8");
    const styleFiles = [
      "base.css",
      "buttons.css",
      "dropdown.css",
      "layout.css",
      "sidebar.css",
      "toolbar.css",
      ...noteStyleFiles,
      ...dialogStyleFiles,
      ...editorStyleFiles,
      ...settingsStyleFiles,
    ];

    for (const file of styleFiles) {
      expect(existsSync(resolve(RENDERER_SRC, "styles", file))).toBe(true);
      expect(styleEntry).toContain(`@import "./styles/${file}";`);
    }
    expect(styleEntry).toContain(
      [
        '@import "./styles/base.css";',
        '@import "./styles/buttons.css";',
        '@import "./styles/dropdown.css";',
        '@import "./styles/layout.css";',
        '@import "./styles/sidebar.css";',
        '@import "./styles/toolbar.css";',
        '@import "./styles/notes-list.css";',
        '@import "./styles/note-card.css";',
        '@import "./styles/note-card-meta.css";',
        '@import "./styles/note-card-content.css";',
        '@import "./styles/note-card-tags.css";',
        '@import "./styles/checklist-preview.css";',
        '@import "./styles/note-actions.css";',
        '@import "./styles/dialogs.css";',
        '@import "./styles/shortcut-help.css";',
        '@import "./styles/editor-layout.css";',
        '@import "./styles/editor-main.css";',
        '@import "./styles/markdown-preview.css";',
        '@import "./styles/editor-side.css";',
        '@import "./styles/settings-view.css";',
        '@import "./styles/settings-tabs.css";',
        '@import "./styles/settings-form.css";',
        '@import "./styles/tag-manager.css";',
      ].join("\n"),
    );

    expect(existsSync(resolve(RENDERER_SRC, "styles/notes.css"))).toBe(false);
    expect(styleEntry).not.toContain('@import "./styles/notes.css";');
    expect(styleEntry).not.toContain('@import "./styles/editor.css";');
    expect(styleEntry).not.toContain('@import "./styles/settings.css";');
    expect(styleEntry).not.toContain(".note-card {");
    expect(styleEntry).not.toContain(".settings-view {");
  });

  it("下拉按钮和菜单组件按 ui 子目录独立维护", () => {
    const dropdownDir = resolve(RENDERER_SRC, "components/ui/dropdown");
    const styleEntry = readFileSync(resolve(RENDERER_SRC, "styles.css"), "utf8");
    const dropdownStyles = readFileSync(
      resolve(RENDERER_SRC, "styles/dropdown.css"),
      "utf8",
    );

    expect(existsSync(resolve(dropdownDir, "DropdownButton.tsx"))).toBe(true);
    expect(existsSync(resolve(dropdownDir, "DropdownMenu.tsx"))).toBe(true);
    expect(styleEntry).toContain('@import "./styles/dropdown.css";');
    expect(dropdownStyles).toContain(".dropdown-anchor");
    expect(dropdownStyles).toContain(".dropdown-menu");
    expect(dropdownStyles).toContain("max-height: min(280px, calc(100vh - 96px));");
    expect(dropdownStyles).toContain("overflow-y: auto;");
    expect(dropdownStyles).toContain(".dropdown-menu button:hover");
  });

  it("笔记卡片菜单向下展开，避免新增菜单项被列表顶部裁切", () => {
    const noteActionStyles = readStyleFile("note-actions.css");
    const contextMenuBlock = readCssRuleBlock(noteActionStyles, ".note-context-menu");

    // Portal 模式下菜单定位由 JS 动态计算，CSS 只保留右对齐方向。
    expect(contextMenuBlock).toContain("right: 0;");
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
    const noteListStyles = readStyleFile("notes-list.css");
    const noteCardStyles = readStyleFile("note-card.css");
    const noteMetaStyles = readStyleFile("note-card-meta.css");
    const noteContentStyles = readStyleFile("note-card-content.css");
    const noteTagStyles = readStyleFile("note-card-tags.css");
    const checklistPreviewStyles = readStyleFile("checklist-preview.css");
    const noteActionStyles = readStyleFile("note-actions.css");
    const editorLayoutStyles = readStyleFile("editor-layout.css");
    const editorMainStyles = readStyleFile("editor-main.css");
    const markdownPreviewStyles = readStyleFile("markdown-preview.css");
    const editorSideStyles = readStyleFile("editor-side.css");
    const settingsViewStyles = readStyleFile("settings-view.css");
    const settingsTabsStyles = readStyleFile("settings-tabs.css");
    const settingsFormStyles = readStyleFile("settings-form.css");
    const tagManagerStyles = readStyleFile("tag-manager.css");

    expect(sidebarStyles).not.toContain(".notes-list");
    expect(sidebarStyles).not.toContain(".tag-picker");
    expect(sidebarStyles).not.toContain(".tag-manager-list");
    expect(toolbarStyles).not.toContain(".form-field");
    expect(toolbarStyles).not.toContain(".setting-row");
    for (const styles of [
      noteListStyles,
      noteCardStyles,
      noteMetaStyles,
      noteContentStyles,
      noteTagStyles,
      checklistPreviewStyles,
      noteActionStyles,
    ]) {
      expect(styles).not.toContain(".settings-actions");
      expect(styles).not.toContain(".editor-head");
      expect(styles).not.toContain(".tag-add-row");
    }
    expect(noteListStyles).toContain(".notes-list");
    expect(noteCardStyles).toContain(".note-card");
    expect(noteCardStyles).not.toContain(".note-meta");
    expect(noteCardStyles).not.toContain(".note-body-preview");
    expect(noteCardStyles).not.toContain(".tags");
    expect(noteMetaStyles).toContain(".note-meta");
    expect(noteContentStyles).toContain(".note-body-preview");
    expect(noteContentStyles).toContain(".note-content-preview");
    expect(noteTagStyles).toContain(".tags");
    expect(noteTagStyles).toContain(".tag");
    expect(checklistPreviewStyles).toContain(".checklist-preview");
    expect(noteActionStyles).toContain(".card-actions");
    expect(editorLayoutStyles).toContain(".editor-overlay");
    expect(editorLayoutStyles).toContain(".editor-actions");
    expect(editorMainStyles).toContain(".editor-textarea-container");
    expect(editorMainStyles).toContain(".line-numbers");
    expect(markdownPreviewStyles).toContain(".markdown-preview");
    expect(editorSideStyles).toContain(".editor-side");
    for (const styles of [
      editorLayoutStyles,
      editorMainStyles,
      markdownPreviewStyles,
      editorSideStyles,
    ]) {
      expect(styles).not.toContain(".settings-head");
      expect(styles).not.toContain(".settings-main");
    }
    expect(settingsViewStyles).toContain(".settings-view");
    expect(settingsTabsStyles).toContain(".settings-tab");
    expect(settingsFormStyles).toContain(".setting-row");
    expect(tagManagerStyles).toContain(".tag-manager-list");
  });

  it("笔记卡片清单预览使用紧凑行距", () => {
    // 卡片预览的视觉密度由职责样式文件锁定，避免组件测试依赖浏览器布局实现。
    const noteStyles = readStyleFile("checklist-preview.css");
    const checklistPreviewBlock =
      noteStyles.match(/\.checklist-preview\s*\{[^}]*\}/)?.[0] ?? "";
    const checkItemBlock = noteStyles.match(/\.check-item\s*\{[^}]*\}/)?.[0] ?? "";
    const checkItemCheckboxBlock =
      noteStyles.match(/\.check-item input\[type="checkbox"\]\s*\{[^}]*\}/)?.[0] ?? "";

    expect(checklistPreviewBlock).toContain("gap: 4px;");
    expect(checkItemBlock).toContain("line-height: 1.25;");
    expect(checkItemCheckboxBlock).toContain("width: 16px;");
    expect(checkItemCheckboxBlock).toContain("height: 16px;");
    expect(checkItemCheckboxBlock).toContain("min-height: 0;");
  });

  it("笔记卡片分段进度条使用不同状态色", () => {
    const noteStyles = readStyleFile("checklist-preview.css");
    const containerBlock = readCssRuleBlock(noteStyles, ".progress-bar-container");
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
});
