/** @vitest-environment jsdom */
// React 渲染层响应式样式契约测试。
// 作用：
// 1. 锁定 720px 最小宽度契约。
// 2. 确保工具栏在窄屏下允许换行而不是横向溢出。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { RENDERER_SRC, readCssRuleBlock, readRendererStyles } from "./testUtils";

function readStyleFile(file: string): string {
  return readFileSync(resolve(RENDERER_SRC, "styles", file), "utf8");
}

function readStyleFiles(files: string[]): string {
  return files.map((file) => readStyleFile(file)).join("\n");
}

describe("App responsive style contracts", () => {
  it("720-960 窄屏不被基础宽度和工具栏固定布局阻断", () => {
    const baseStyles = readFileSync(resolve(RENDERER_SRC, "styles/base.css"), "utf8");
    const toolbarStyles = readFileSync(
      resolve(RENDERER_SRC, "styles/toolbar.css"),
      "utf8",
    );
    const bodyBlock = readCssRuleBlock(baseStyles, "body");
    const toolbarBlock = readCssRuleBlock(toolbarStyles, ".toolbar");
    const searchFieldBlock = readCssRuleBlock(toolbarStyles, ".search-field");
    const selectGroupBlock = readCssRuleBlock(toolbarStyles, ".toolbar-select-group");
    const toolbarControlBlock = readCssRuleBlock(
      toolbarStyles,
      ".toolbar input,\n.toolbar select",
    );

    expect(bodyBlock).toContain("min-width: 720px;");
    expect(bodyBlock).not.toContain("min-width: 960px;");
    expect(bodyBlock).not.toMatch(/min-width:\s*(?:9[6-9]\d|[1-9]\d{3,})px;/);
    expect(toolbarBlock).toContain("flex-wrap: wrap;");
    expect(toolbarBlock).not.toContain("overflow-x:");
    expect(searchFieldBlock).toContain("flex: 1 1 240px;");
    expect(searchFieldBlock).toContain("min-width: 0;");
    expect(selectGroupBlock).toContain("flex: 1 1 132px;");
    expect(selectGroupBlock).toContain("min-width: 132px;");
    expect(toolbarControlBlock).toContain("width: 100%;");
    expect(toolbarStyles).not.toContain("white-space: nowrap;");
  });

  it("编辑器在 720px 窄屏附近切换为单栏布局", () => {
    const editorStyles = readStyleFiles(["editor-layout.css", "editor-side.css"]);

    expect(editorStyles).toContain("@media (max-width: 760px)");
    expect(editorStyles).toMatch(
      /@media \(max-width: 760px\)[\s\S]*\.editor-body\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\);/,
    );
    expect(editorStyles).toMatch(
      /@media \(max-width: 760px\)[\s\S]*\.editor-side\s*\{[\s\S]*padding-left:\s*0;/,
    );
    expect(editorStyles).toMatch(
      /@media \(max-width: 760px\)[\s\S]*\.editor-side\s*\{[\s\S]*border-left:\s*0;/,
    );
    expect(editorStyles).toMatch(
      /@media \(max-width: 760px\)[\s\S]*\.editor-actions\s*\{[\s\S]*flex-wrap:\s*wrap;/,
    );
  });

  it("设置页在 720px 窄屏附近避免固定侧栏挤压内容", () => {
    const settingsStyles = readStyleFiles(["settings-view.css", "settings-tabs.css"]);

    expect(settingsStyles).toContain("@media (max-width: 760px)");
    expect(settingsStyles).toMatch(
      /@media \(max-width: 760px\)[\s\S]*\.settings-body\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\);/,
    );
    expect(settingsStyles).toMatch(
      /@media \(max-width: 760px\)[\s\S]*\.settings-sidebar\s*\{[\s\S]*flex-direction:\s*row;/,
    );
    expect(settingsStyles).toMatch(
      /@media \(max-width: 760px\)[\s\S]*\.settings-sidebar\s*\{[\s\S]*overflow-x:\s*auto;/,
    );
    expect(settingsStyles).toMatch(
      /@media \(max-width: 760px\)[\s\S]*\.settings-tab\s*\{[\s\S]*flex:\s*1 0 160px;/,
    );
  });

  it("概览统计在 720px 窄屏附近不保持固定 4/3 列", () => {
    const layoutStyles = readStyleFile("layout.css");

    expect(layoutStyles).toContain("@media (max-width: 760px)");
    expect(layoutStyles).toMatch(
      /@media \(max-width: 760px\)[\s\S]*\.stats-summary\s*\{[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/,
    );
    expect(layoutStyles).toMatch(
      /@media \(max-width: 760px\)[\s\S]*\.stats-groups\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\);/,
    );
    expect(layoutStyles).not.toMatch(
      /@media \(max-width: 760px\)[\s\S]*\.stats-summary\s*\{[\s\S]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\);/,
    );
    expect(layoutStyles).not.toMatch(
      /@media \(max-width: 760px\)[\s\S]*\.stats-groups\s*\{[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/,
    );
  });

  it("长标题、长标签和长按钮文案不会撑破容器", () => {
    const styles = [readRendererStyles(), readStyleFile("note-card-tags.css")].join(
      "\n",
    );
    const noteTitleBlock = readCssRuleBlock(styles, ".note-title");
    const tagOptionBlock = readCssRuleBlock(styles, ".tag-option");
    const tagBlock = readCssRuleBlock(styles, ".tag");
    const appButtonBlock = readCssRuleBlock(styles, ".app-button");

    expect(noteTitleBlock).toContain("overflow-wrap: anywhere;");
    expect(tagOptionBlock).toContain("max-width: 100%;");
    expect(tagOptionBlock).toContain("overflow-wrap: anywhere;");
    expect(tagBlock).toContain("max-width: 100%;");
    expect(tagBlock).toContain("overflow-wrap: anywhere;");
    expect(appButtonBlock).toContain("min-width: 0;");
    expect(appButtonBlock).toContain("white-space: normal;");
  });
});
