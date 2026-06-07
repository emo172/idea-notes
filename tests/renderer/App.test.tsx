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
      "App.toolbar-controls.test.tsx",
      "App.search-query.test.tsx",
      "App.keyboard-shortcuts.test.tsx",
      "App.overview.test.tsx",
      "App.ui-contracts.test.tsx",
      "App.theme-mode.test.tsx",
      "App.style-boundary.test.tsx",
      "App.responsive-style.test.tsx",
      "App.deadline-style.test.tsx",
      "App.tags-crud.test.tsx",
      "App.tags-failure.test.tsx",
      "App.tags-color.test.tsx",
      "App.settings-appearance.test.tsx",
      "App.settings-startup.test.tsx",
      "App.settings-reminders.test.tsx",
      "App.settings-backup.test.tsx",
      "App.settings-reset.test.tsx",
      "App.settings-i18n.test.tsx",
      "App.card-content.test.tsx",
      "App.card-deadline.test.tsx",
      "App.card-meta.test.tsx",
      "App.card-actions.test.tsx",
      "App.trash-actions.test.tsx",
      "App.trash-confirm.test.tsx",
      "App.trash-failure.test.tsx",
      "App.duplicate-flow.test.tsx",
    ];

    for (const file of splitFiles) {
      expect(existsSync(resolve(rendererTests, file))).toBe(true);
    }

    expect(
      ["toolbar", "card-render", "trash-flow", "settings-system", "tags"].some((name) =>
        existsSync(resolve(rendererTests, `App.${name}.test.tsx`)),
      ),
    ).toBe(false);

    const thisFile = readFileSync(resolve(rendererTests, "App.test.tsx"), "utf8");
    expect(thisFile.match(/\bit\(/g) ?? []).toHaveLength(11);
    expect(thisFile.split("\n").length).toBeLessThan(320);
    expect(thisFile).not.toMatch(/^function installApi/m);
  });

  it("拆分 App 主内容和覆盖层组合组件", () => {
    const appPath = resolve("src/renderer/src/app");
    const appFiles = [
      "MainNotesView.tsx",
      "OverviewView.tsx",
      "TagSettingsView.tsx",
      "SettingsOverlay.tsx",
      "EditorOverlay.tsx",
      "ConfirmOverlays.tsx",
    ];
    const mainContentSource = readFileSync(
      resolve(appPath, "AppMainContent.tsx"),
      "utf8",
    );
    const overlaysSource = readFileSync(resolve(appPath, "AppOverlays.tsx"), "utf8");

    for (const file of appFiles) {
      expect(existsSync(resolve(appPath, file))).toBe(true);
    }

    for (const component of ["MainNotesView", "OverviewView", "TagSettingsView"]) {
      expect(mainContentSource).toContain(
        `import { ${component} } from "./${component}";`,
      );
      expect(mainContentSource).toContain(`<${component}`);
    }
    expect(mainContentSource).not.toContain("<NotesToolbar");
    expect(mainContentSource).not.toContain("<NotesList");
    expect(mainContentSource).not.toContain("<StatsPanel");
    expect(mainContentSource).not.toContain("<TagSettingsPanel");

    for (const component of ["SettingsOverlay", "EditorOverlay", "ConfirmOverlays"]) {
      expect(overlaysSource).toContain(
        `import { ${component} } from "./${component}";`,
      );
      expect(overlaysSource).toContain(`<${component}`);
    }
    expect(overlaysSource).not.toContain("<SettingsPanel");
    expect(overlaysSource).not.toContain("<EditorDialog");
    expect(overlaysSource.match(/<ConfirmDialog/g) ?? []).toHaveLength(0);
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
    const mainNotesViewPath = resolve("src/renderer/src/app/MainNotesView.tsx");
    const mainNotesViewSource = readFileSync(mainNotesViewPath, "utf8");

    expect(existsSync(toolbarPath)).toBe(true);
    expect(mainNotesViewSource).toContain(
      'import { NotesToolbar } from "../components/toolbar/NotesToolbar";',
    );
    expect(mainNotesViewSource).toContain("<NotesToolbar");
    expect(mainNotesViewSource).not.toContain('className="toolbar"');
    expect(mainNotesViewSource).not.toContain('className="search-field"');
    expect(mainNotesViewSource).not.toContain('className="toolbar-select-group"');
  });

  it("抽出 NotesList 承载笔记列表 JSX", () => {
    const notesListPath = resolve("src/renderer/src/components/notes/NotesList.tsx");
    const mainNotesViewPath = resolve("src/renderer/src/app/MainNotesView.tsx");
    const mainNotesViewSource = readFileSync(mainNotesViewPath, "utf8");

    expect(existsSync(notesListPath)).toBe(true);
    expect(mainNotesViewSource).toContain(
      'import { NotesList } from "../components/notes/NotesList";',
    );
    expect(mainNotesViewSource).toContain("<NotesList");
    expect(mainNotesViewSource).not.toContain('className="notes-list"');
    expect(mainNotesViewSource).not.toContain("visibleNotes.map(");
    expect(mainNotesViewSource).not.toContain("copy.loadErrorTitle");
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

  it("拆分 AppShell 标题栏和侧栏子组件", () => {
    const shellPath = resolve("src/renderer/src/components/shell");
    const appShellSource = readFileSync(resolve(shellPath, "AppShell.tsx"), "utf8");

    for (const component of ["Titlebar", "SidebarNav", "SidebarTags"]) {
      expect(existsSync(resolve(shellPath, `${component}.tsx`))).toBe(true);
      expect(appShellSource).toContain(
        `import { ${component} } from "./${component}";`,
      );
      expect(appShellSource).toContain(`<${component}`);
    }

    expect(appShellSource).not.toContain('className="titlebar"');
    expect(appShellSource).not.toContain('className="nav-menu"');
    expect(appShellSource).not.toContain('className="tag-stack"');
    expect(appShellSource).not.toContain("tags.map(");
  });

  it("拆分标签设置面板子组件和草稿 hook", () => {
    const settingsPath = resolve("src/renderer/src/components/settings");
    const tagSettingsSource = readFileSync(
      resolve(settingsPath, "TagSettingsPanel.tsx"),
      "utf8",
    );

    for (const file of [
      "TagAddForm.tsx",
      "TagManagerList.tsx",
      "TagManagerItem.tsx",
      "useTagDrafts.ts",
    ]) {
      expect(existsSync(resolve(settingsPath, file))).toBe(true);
    }

    for (const component of ["TagAddForm", "TagManagerList"]) {
      expect(tagSettingsSource).toContain(
        `import { ${component} } from "./${component}";`,
      );
      expect(tagSettingsSource).toContain(`<${component}`);
    }
    expect(tagSettingsSource).toContain(
      'import { useTagDrafts } from "./useTagDrafts";',
    );
    expect(tagSettingsSource).toContain("useTagDrafts({");
    expect(tagSettingsSource).not.toContain('className="tag-add-row"');
    expect(tagSettingsSource).not.toContain('className="tag-manager-item"');
    expect(tagSettingsSource).not.toContain("data.tags.map(");
    expect(tagSettingsSource).not.toContain("useState<Map");
  });

  it("拆分笔记卡片更多操作菜单", () => {
    const notesPath = resolve("src/renderer/src/components/notes");
    const headerSource = readFileSync(resolve(notesPath, "NoteCardHeader.tsx"), "utf8");

    expect(existsSync(resolve(notesPath, "NoteCardMenu.tsx"))).toBe(true);
    expect(headerSource).toContain('import { NoteCardMenu } from "./NoteCardMenu";');
    expect(headerSource).toContain("<NoteCardMenu");
    expect(headerSource).not.toContain("<DropdownMenu");
    expect(headerSource).not.toContain("copy.menuRestoreArchive");
    expect(headerSource).not.toContain("copy.permanentDelete");
  });
});
