/** @vitest-environment jsdom */
// React 渲染层工具栏和通用 UI 契约测试。
// 作用：
// 1. 覆盖筛选重置按钮和不同视图下的筛选清空行为。
// 2. 锁定通用按钮、图标和 DialogShell 复用契约。
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import type { NoteStatus } from "@shared/types";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import {
  BASE_TIME,
  RENDERER_SRC,
  installApi,
  readCssRuleBlock,
  readRendererStyles,
} from "./testUtils";

describe("App toolbar and UI contracts", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("关键按钮使用统一按钮组件并展示更醒目的图标", async () => {
    installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");
    const newButton = screen.getByRole("button", { name: "新建" });
    const sidebarButton = screen.getByRole("button", { name: "收起/展开侧栏" });
    const minimizeButton = screen.getByRole("button", { name: "最小化" });
    const maximizeButton = screen.getByRole("button", { name: "最大化" });
    const closeButton = screen.getByRole("button", { name: "关闭" });
    const activeNavButton = screen.getByRole("button", { name: /进行中/ });
    const completedNavButton = screen.getByRole("button", { name: /已完成/ });
    const trashNavButton = screen.getByRole("button", { name: /回收站/ });
    const tagSettingsButton = screen.getByRole("button", {
      name: "标签设置",
    });
    const completeButton = screen.getAllByRole("button", {
      name: "完成",
    })[0];
    const deleteButton = screen.getAllByRole("button", { name: "删除" })[0];

    for (const button of [
      newButton,
      sidebarButton,
      minimizeButton,
      maximizeButton,
      closeButton,
      activeNavButton,
      completedNavButton,
      trashNavButton,
      tagSettingsButton,
      completeButton,
      deleteButton,
    ]) {
      expect(button.classList.contains("app-button")).toBe(true);
      expect(button.querySelector(".app-button-icon svg")).toBeTruthy();
    }

    await user.click(newButton);
    for (const label of ["取消", "保存"]) {
      const button = screen.getByRole("button", { name: label });
      expect(button.classList.contains("app-button")).toBe(true);
      expect(button.classList.contains("app-button-size-md")).toBe(true);
      expect(button.classList.contains("editor-action-button")).toBe(true);
      expect(button.querySelector(".app-button-icon svg")).toBeTruthy();
    }
  });

  it("筛选重置按钮使用重置图标", () => {
    const toolbarSource = readFileSync(
      resolve("src/renderer/src/components/toolbar/NotesToolbar.tsx"),
      "utf8",
    );

    expect(toolbarSource).toContain("ArrowCounterClockwiseIcon");
    expect(toolbarSource).not.toContain("BroomIcon");
    expect(toolbarSource).not.toContain("XCircleIcon");
  });

  it.each([
    {
      label: "进行中",
      status: "active" as NoteStatus,
      title: "进行中筛选目标",
    },
    {
      label: "已完成",
      status: "completed" as NoteStatus,
      title: "已完成筛选目标",
    },
    { label: "回收站", status: "trash" as NoteStatus, title: "回收站筛选目标" },
  ])(
    "$label 视图的重置筛选按钮会清空搜索并还原下拉菜单",
    async ({ label, status, title }) => {
      const data = getDefaultData(BASE_TIME);
      data.notes = [
        {
          ...data.notes[0],
          id: `${status}-filter-target`,
          title,
          status,
          priority: "high",
          tags: ["工作"],
          trashedAt: status === "trash" ? BASE_TIME : undefined,
        },
      ];
      installApi(data);
      const user = userEvent.setup();

      render(<App />);

      if (status !== "active") {
        await user.click(
          await screen.findByRole("button", { name: new RegExp(label) }),
        );
      }
      await screen.findByText(title);

      const searchInput = screen.getByLabelText("搜索") as HTMLInputElement;
      const prioritySelect = screen.getByLabelText("优先级") as HTMLSelectElement;
      const sortSelect = screen.getByLabelText("排序") as HTMLSelectElement;
      const workTagButton = screen.getByRole("button", { name: "#工作" });

      await user.type(searchInput, "筛选词");
      await user.selectOptions(prioritySelect, "high");
      await user.selectOptions(sortSelect, "newest");
      await user.click(workTagButton);

      expect(searchInput.value).toBe("筛选词");
      expect(prioritySelect.value).toBe("high");
      expect(sortSelect.value).toBe("newest");
      expect(workTagButton.classList.contains("selected")).toBe(true);

      await user.click(screen.getByRole("button", { name: "重置筛选" }));

      expect(searchInput.value).toBe("");
      expect(prioritySelect.value).toBe("all");
      expect(sortSelect.value).toBe("important");
      expect(workTagButton.classList.contains("selected")).toBe(false);
    },
  );

  it("搜索框支持标签、优先级和截止状态语法并兼容标签名普通搜索", async () => {
    vi.spyOn(Date, "now").mockReturnValue(BASE_TIME);
    const data = getDefaultData(BASE_TIME);
    data.notes = [
      {
        ...data.notes[0],
        id: "search-overdue-work",
        title: "桌面窗口实现",
        body: "Electron 主进程",
        priority: "high",
        tags: ["工作"],
        dueAt: "2026-05-28T18:00",
        updatedAt: BASE_TIME + 20,
      },
      {
        ...data.notes[1],
        id: "search-reading-note",
        title: "书单整理",
        body: "本周阅读计划",
        priority: "medium",
        tags: ["阅读"],
        dueAt: "2026-05-30T18:00",
        updatedAt: BASE_TIME + 40,
      },
      {
        ...data.notes[1],
        id: "search-other-work",
        title: "工作复盘",
        body: "窗口体验回顾",
        priority: "low",
        tags: ["工作"],
        dueAt: "2026-05-30T18:00",
        updatedAt: BASE_TIME + 60,
      },
    ];
    installApi(data);
    const user = userEvent.setup();

    render(<App />);

    const searchInput = await screen.findByLabelText("搜索");
    await user.type(searchInput, "窗口 tag:工作 priority:high due:overdue");

    expect(
      await screen.findByText(
        (_, element) =>
          element?.classList.contains("note-title") === true &&
          element.textContent === "桌面窗口实现",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("书单整理")).toBeNull();
    expect(screen.queryByText("工作复盘")).toBeNull();

    await user.clear(searchInput);
    await user.type(searchInput, "阅读");

    expect(await screen.findByText("书单整理")).toBeTruthy();
    expect(screen.queryByText("桌面窗口实现")).toBeNull();
  });

  it("Ctrl+F 聚焦搜索，Ctrl+数字切换视图且输入时不误切视图", async () => {
    const data = getDefaultData(BASE_TIME);
    data.notes = [
      {
        ...data.notes[0],
        id: "active-shortcut-note",
        title: "进行中快捷键目标",
        status: "active",
      },
      {
        ...data.notes[1],
        id: "completed-shortcut-note",
        title: "已完成快捷键目标",
        status: "completed",
      },
      {
        ...data.notes[1],
        id: "archive-shortcut-note",
        title: "归档快捷键目标",
        status: "archive",
      },
      {
        ...data.notes[1],
        id: "trash-shortcut-note",
        title: "回收站快捷键目标",
        status: "trash",
        trashedAt: BASE_TIME,
      },
    ];
    installApi(data);
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText("进行中快捷键目标");
    await user.keyboard("{Control>}f{/Control}");
    const searchInput = screen.getByLabelText("搜索");
    expect(searchInput).toBe(document.activeElement);

    await user.keyboard("{Control>}2{/Control}");
    expect(screen.queryByText("已完成快捷键目标")).toBeNull();

    await user.keyboard("{Control>}1{/Control}");
    expect(await screen.findByText("进行中快捷键目标")).toBeTruthy();
    await searchInput.blur();
    await user.keyboard("{Control>}2{/Control}");
    expect(await screen.findByText("已完成快捷键目标")).toBeTruthy();
    await user.keyboard("{Control>}3{/Control}");
    expect(await screen.findByText("归档快捷键目标")).toBeTruthy();
    await user.keyboard("{Control>}4{/Control}");
    expect(await screen.findByText("回收站快捷键目标")).toBeTruthy();
  });

  it("概览统计项可点击反向筛选到对应列表", async () => {
    const data = getDefaultData(BASE_TIME);
    data.notes = [
      {
        ...data.notes[0],
        id: "stats-high-work",
        title: "统计高优先级工作",
        status: "active",
        priority: "high",
        tags: ["工作"],
      },
      {
        ...data.notes[1],
        id: "stats-low-idea",
        title: "统计低优先级灵感",
        status: "active",
        priority: "low",
        tags: ["灵感"],
      },
      {
        ...data.notes[1],
        id: "stats-archive",
        title: "统计归档笔记",
        status: "archive",
        priority: "medium",
        tags: ["工作"],
      },
    ];
    installApi(data);
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "概览" }));
    await user.click(screen.getByRole("button", { name: "归档 1" }));
    expect(await screen.findByText("统计归档笔记")).toBeTruthy();
    expect(screen.queryByText("统计高优先级工作")).toBeNull();

    await user.click(screen.getByRole("button", { name: "概览" }));
    await user.click(screen.getByRole("button", { name: "重要 1" }));
    expect(await screen.findByText("统计高优先级工作")).toBeTruthy();
    expect(screen.queryByText("统计低优先级灵感")).toBeNull();

    await user.click(screen.getByRole("button", { name: "概览" }));
    await user.click(screen.getByRole("button", { name: "#灵感 1" }));
    expect(await screen.findByText("统计低优先级灵感")).toBeTruthy();
    expect(screen.queryByText("统计高优先级工作")).toBeNull();
  });

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
