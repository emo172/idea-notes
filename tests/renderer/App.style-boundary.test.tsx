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
  "checklist-preview.css",
  "note-actions.css",
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
      "dialogs.css",
      "editor.css",
      "settings.css",
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
        '@import "./styles/checklist-preview.css";',
        '@import "./styles/note-actions.css";',
        '@import "./styles/dialogs.css";',
        '@import "./styles/editor.css";',
        '@import "./styles/settings.css";',
      ].join("\n"),
    );

    expect(existsSync(resolve(RENDERER_SRC, "styles/notes.css"))).toBe(false);
    expect(styleEntry).not.toContain('@import "./styles/notes.css";');
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
    const noteListStyles = readStyleFile("notes-list.css");
    const noteCardStyles = readStyleFile("note-card.css");
    const checklistPreviewStyles = readStyleFile("checklist-preview.css");
    const noteActionStyles = readStyleFile("note-actions.css");
    const editorStyles = readFileSync(
      resolve(RENDERER_SRC, "styles/editor.css"),
      "utf8",
    );

    expect(sidebarStyles).not.toContain(".notes-list");
    expect(sidebarStyles).not.toContain(".tag-picker");
    expect(sidebarStyles).not.toContain(".tag-manager-list");
    expect(toolbarStyles).not.toContain(".form-field");
    expect(toolbarStyles).not.toContain(".setting-row");
    for (const styles of [
      noteListStyles,
      noteCardStyles,
      checklistPreviewStyles,
      noteActionStyles,
    ]) {
      expect(styles).not.toContain(".settings-actions");
      expect(styles).not.toContain(".editor-head");
      expect(styles).not.toContain(".tag-add-row");
    }
    expect(noteListStyles).toContain(".notes-list");
    expect(noteCardStyles).toContain(".note-card");
    expect(checklistPreviewStyles).toContain(".checklist-preview");
    expect(noteActionStyles).toContain(".card-actions");
    expect(editorStyles).not.toContain(".settings-head");
    expect(editorStyles).not.toContain(".settings-main");
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
