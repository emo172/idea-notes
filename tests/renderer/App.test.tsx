// React 渲染层测试结构守护。
// 作用：
// 1. 确认原单体 App.test.tsx 已拆分为按职责维护的测试文件。
// 2. 锁定共享测试工具存在，避免后续把重复 mock 逻辑重新塞回单个大文件。
// 3. 保持 tests/renderer/App.test.tsx 作为入口索引式守护，而不再承载全部用例。
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("App renderer test structure", () => {
  it("按功能域拆分 App 渲染层测试文件", () => {
    const rendererTests = resolve("tests/renderer");
    const splitFiles = [
      "testUtils.ts",
      "App.core.test.tsx",
      "App.editor-create.test.tsx",
      "App.editor-update.test.tsx",
      "App.editor-failure.test.tsx",
      "App.sidebar.test.tsx",
      "App.window-controls.test.tsx",
      "App.toolbar.test.tsx",
      "App.theme-mode.test.tsx",
      "App.style-boundary.test.tsx",
      "App.responsive-style.test.tsx",
      "App.deadline-style.test.tsx",
      "App.tags.test.tsx",
      "App.settings-appearance.test.tsx",
      "App.settings-system.test.tsx",
      "App.settings-reset.test.tsx",
      "App.settings-i18n.test.tsx",
      "App.card-render.test.tsx",
      "App.card-actions.test.tsx",
      "App.trash-flow.test.tsx",
      "App.duplicate-flow.test.tsx",
    ];

    for (const file of splitFiles) {
      expect(existsSync(resolve(rendererTests, file))).toBe(true);
    }

    const thisFile = readFileSync(resolve(rendererTests, "App.test.tsx"), "utf8");
    expect(thisFile.match(/\bit\(/g) ?? []).toHaveLength(7);
    expect(thisFile.split("\n").length).toBeLessThan(170);
    expect(thisFile).not.toMatch(/^function installApi/m);
  });

  it("抽出 useNoteFilters 管理笔记筛选状态", () => {
    const hookPath = resolve("src/renderer/src/hooks/useNoteFilters.ts");
    const appPath = resolve("src/renderer/src/app/IdeaNotesApp.tsx");
    const appSource = readFileSync(appPath, "utf8");

    expect(existsSync(hookPath)).toBe(true);
    expect(appSource).toContain(
      'import { useNoteFilters } from "../hooks/useNoteFilters";',
    );
    expect(appSource).toContain("useNoteFilters({");
    expect(appSource).not.toContain("filterAndSortNotes(");
    expect(appSource).not.toContain("const [searchQuery");
    expect(appSource).not.toContain("const [priority");
    expect(appSource).not.toContain("const [sortMode");
    expect(appSource).not.toContain("const [selectedTags");
  });

  it("抽出 NotesToolbar 承载工具栏 JSX", () => {
    const toolbarPath = resolve("src/renderer/src/components/toolbar/NotesToolbar.tsx");
    const mainContentPath = resolve("src/renderer/src/app/AppMainContent.tsx");
    const mainContentSource = readFileSync(mainContentPath, "utf8");

    expect(existsSync(toolbarPath)).toBe(true);
    expect(mainContentSource).toContain(
      'import { NotesToolbar } from "../components/toolbar/NotesToolbar";',
    );
    expect(mainContentSource).toContain("<NotesToolbar");
    expect(mainContentSource).not.toContain('className="toolbar"');
    expect(mainContentSource).not.toContain('className="search-field"');
    expect(mainContentSource).not.toContain('className="toolbar-select-group"');
  });

  it("抽出 NotesList 承载笔记列表 JSX", () => {
    const notesListPath = resolve("src/renderer/src/components/notes/NotesList.tsx");
    const mainContentPath = resolve("src/renderer/src/app/AppMainContent.tsx");
    const mainContentSource = readFileSync(mainContentPath, "utf8");

    expect(existsSync(notesListPath)).toBe(true);
    expect(mainContentSource).toContain(
      'import { NotesList } from "../components/notes/NotesList";',
    );
    expect(mainContentSource).toContain("<NotesList");
    expect(mainContentSource).not.toContain('className="notes-list"');
    expect(mainContentSource).not.toContain("visibleNotes.map(");
    expect(mainContentSource).not.toContain("copy.loadErrorTitle");
  });

  it("拆分 NoteCard 子结构并隔离截止状态逻辑", () => {
    const notesPath = resolve("src/renderer/src/components/notes");
    const splitFiles = [
      "NoteCardHeader.tsx",
      "NoteCardMeta.tsx",
      "NoteContentPreview.tsx",
      "ChecklistPreview.tsx",
      "NoteCardActions.tsx",
      "noteDeadline.ts",
    ];
    const noteCardSource = readFileSync(resolve(notesPath, "NoteCard.tsx"), "utf8");

    for (const file of splitFiles) {
      expect(existsSync(resolve(notesPath, file))).toBe(true);
    }

    expect(noteCardSource).toContain(
      'import { NoteCardHeader } from "./NoteCardHeader";',
    );
    expect(noteCardSource).toContain('import { NoteCardMeta } from "./NoteCardMeta";');
    expect(noteCardSource).toContain(
      'import { NoteContentPreview } from "./NoteContentPreview";',
    );
    expect(noteCardSource).toContain(
      'import { NoteCardActions } from "./NoteCardActions";',
    );
    expect(noteCardSource).toContain(
      'import { getDeadlineStatus } from "./noteDeadline";',
    );
    expect(noteCardSource).not.toContain("function getDeadlineStatus");
  });

  it("抽出 useIdeaNotesData 管理加载和保存状态", () => {
    const hookPath = resolve("src/renderer/src/hooks/useIdeaNotesData.ts");
    const appPath = resolve("src/renderer/src/app/IdeaNotesApp.tsx");
    const appSource = readFileSync(appPath, "utf8");

    expect(existsSync(hookPath)).toBe(true);
    expect(appSource).toContain(
      'import { useIdeaNotesData } from "../hooks/useIdeaNotesData";',
    );
    expect(appSource).toContain("useIdeaNotesData()");
    expect(appSource).not.toContain("const [data, setData]");
    expect(appSource).not.toContain("const [isLoading");
    expect(appSource).not.toContain("const [hasLoadError");
    expect(appSource).not.toContain("const [saveFeedback");
  });

  it("抽出 AppShell 承载标题栏和侧边栏框架", () => {
    const shellPath = resolve("src/renderer/src/components/shell/AppShell.tsx");
    const appPath = resolve("src/renderer/src/app/IdeaNotesApp.tsx");
    const appSource = readFileSync(appPath, "utf8");

    expect(existsSync(shellPath)).toBe(true);
    expect(appSource).toContain(
      'import { AppShell } from "../components/shell/AppShell";',
    );
    expect(appSource).toContain("<AppShell");
    expect(appSource).not.toContain('className="titlebar"');
    expect(appSource).not.toContain('className="sidebar"');
    expect(appSource).not.toContain('className="nav-menu"');
  });
});
