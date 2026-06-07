/** @vitest-environment jsdom */
// React 渲染层通用 UI 合同测试。
// 作用：
// 1. 锁定按钮样式、图标强度和 hover 规则集中维护。
// 2. 验证确认弹窗和编辑器弹窗共用 DialogShell 外壳。
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { RENDERER_SRC, readCssRuleBlock, readRendererStyles } from "./testUtils";

describe("App UI contracts", () => {
  it("按钮组件和样式集中维护 hover 与图标强度", () => {
    const appButtonPath = resolve(RENDERER_SRC, "components/ui/AppButton.tsx");
    const styles = readRendererStyles();
    const noteCompleteActionBlock = readCssRuleBlock(styles, ".note-complete-action");
    const noteDeleteActionBlock = readCssRuleBlock(styles, ".note-delete-action");
    const buttonSizeMdBlock = readCssRuleBlock(styles, ".app-button-size-md");
    const iconButtonBlock = readCssRuleBlock(styles, ".app-button-variant-icon");
    const toolbarBlock = readCssRuleBlock(styles, ".toolbar");
    const titlebarIcons = readFileSync(
      resolve(RENDERER_SRC, "components/titlebar/TitlebarIcons.tsx"),
      "utf8",
    );

    expect(existsSync(appButtonPath)).toBe(true);
    expect(styles).toContain(".app-button:hover");
    expect(styles).toContain(".app-button-variant-primary:hover");
    expect(styles).toContain("--button-bg:");
    expect(styles).toContain("--button-border:");
    expect(styles).toContain("--button-shadow:");
    expect(styles).toContain("--button-hover-shadow:");
    expect(styles).toContain("border: 1px solid var(--button-border);");
    expect(styles).toContain("background: var(--button-bg);");
    expect(styles).toContain("box-shadow: var(--button-shadow);");
    expect(styles).toContain("box-shadow: var(--button-hover-shadow);");
    expect(styles).toContain(".app-button.danger");
    expect(styles).toContain(".app-button.danger:hover");
    expect(styles).toContain(".app-button-icon");
    expect(styles).toContain(".app-button-variant-icon");
    expect(styles).toContain(".app-button-size-md");
    expect(buttonSizeMdBlock).toContain("min-width: 100px;");
    expect(buttonSizeMdBlock).toContain("height: 40px;");
    expect(buttonSizeMdBlock).not.toMatch(/(?:^|[{\s;])width:\s*100px;/);
    expect(iconButtonBlock).toContain("width: 32px;");
    expect(iconButtonBlock).toContain("height: 32px;");
    expect(iconButtonBlock).toContain("min-width: 32px;");
    expect(toolbarBlock).toContain("flex-wrap: wrap;");
    expect(styles).toContain(".editor-action-button");
    expect(styles).toContain(".editor-cancel-action");
    expect(styles).toContain(".editor-save-action");
    expect(styles).not.toContain("width: 104px;");
    expect(styles).toContain("justify-content: flex-start;");
    expect(styles).toContain("margin-left: auto;");
    expect(styles).toContain(".note-complete-action");
    expect(styles).toContain(".note-delete-action");
    expect(noteCompleteActionBlock).toContain(
      "--button-bg: color-mix(in oklab, var(--success), transparent 90%);",
    );
    expect(noteDeleteActionBlock).toContain(
      "--button-bg: color-mix(in oklab, var(--danger), transparent 92%);",
    );
    expect(noteCompleteActionBlock).not.toBe(noteDeleteActionBlock);
    expect(styles).toContain(".titlebar-pin-icon-unpinned");
    expect(styles).toContain(".titlebar-pin-icon-pinned");
    expect(styles).toContain("--button-icon-size: 20px");
    expect(styles).not.toContain("fill: none;");
    expect(styles).not.toContain("stroke-width: 1.8");
    expect(titlebarIcons).toContain('weight="bold"');
    expect(styles).not.toContain(".icon-btn:hover");
    expect(styles).not.toContain(".window-controls button:hover");
    expect(styles).not.toContain(".btn-subtle:hover");
    expect(styles).not.toContain(".card-actions button:hover");
    expect(styles).not.toContain(".editor-actions button:hover");
    expect(styles).not.toContain(".tag-add-row button:hover");
    expect(styles).not.toContain(".settings-sidebar span");
    expect(styles).not.toContain(".confirm-actions button");
    expect(styles).not.toContain(".btn-primary {");
  });

  it("确认弹窗和编辑器弹窗共用 DialogShell 外壳", () => {
    const dialogShellPath = resolve(RENDERER_SRC, "components/dialogs/DialogShell.tsx");
    const confirmDialogSource = readFileSync(
      resolve(RENDERER_SRC, "components/dialogs/ConfirmDialog.tsx"),
      "utf8",
    );
    const editorDialogSource = readFileSync(
      resolve(RENDERER_SRC, "components/editor/EditorDialog.tsx"),
      "utf8",
    );
    const styles = readRendererStyles();

    expect(existsSync(dialogShellPath)).toBe(true);
    expect(confirmDialogSource).toContain("DialogShell");
    expect(editorDialogSource).toContain("DialogShell");
    expect(styles).toContain(".dialog-overlay");
    expect(styles).toContain(".dialog-panel");
    expect(styles).toContain(".dialog-head");
    expect(styles).toContain(".dialog-actions");
    expect(confirmDialogSource).not.toContain('className="confirm-overlay"');
    expect(editorDialogSource).not.toContain('className="editor-overlay"');
  });
});
