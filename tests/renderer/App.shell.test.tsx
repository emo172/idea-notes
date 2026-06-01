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
import type { NoteStatus } from "@shared/types";
import {
  BASE_TIME,
  RENDERER_SRC,
  installApi,
  readCssRuleBlock,
  readRendererStyles,
} from "./testUtils";

describe("App shell navigation and buttons", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("按原型支持侧栏收起和展开", async () => {
    installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    const { container } = render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");
    expect(container.querySelector(".app-body.sidebar-collapsed")).toBeNull();

    await user.click(screen.getByRole("button", { name: "收起/展开侧栏" }));
    expect(container.querySelector(".app-body.sidebar-collapsed")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "收起/展开侧栏" }));
    expect(container.querySelector(".app-body.sidebar-collapsed")).toBeNull();
  });

  it("设置中心支持返回笔记列表", async () => {
    installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    expect(screen.getByRole("heading", { name: "设置中心" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "返回" }));
    expect(await screen.findByText("重构 Desktop App 导航栏")).toBeTruthy();
  });

  it("标题栏置顶和设置按钮使用图标并保留可访问名称", async () => {
    installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");
    const pinButton = screen.getByRole("button", { name: "置顶" });
    const settingsButton = screen.getByRole("button", { name: "设置" });
    const pinIcon = pinButton.querySelector("svg");

    expect(pinIcon).toBeTruthy();
    expect(pinIcon?.classList.contains("titlebar-pin-icon-unpinned")).toBe(
      true,
    );
    expect(pinButton.getAttribute("title")).toBe("置顶");
    expect(settingsButton.querySelector("svg")).toBeTruthy();
    expect(pinButton.textContent?.trim()).toBe("");
    expect(settingsButton.textContent?.trim()).toBe("");

    await user.click(pinButton);
    const pinnedButton = await screen.findByRole("button", {
      name: "取消置顶",
    });
    const pinnedIcon = pinnedButton.querySelector("svg");
    expect(pinnedButton.getAttribute("title")).toBe("取消置顶");
    expect(pinnedIcon?.classList.contains("titlebar-pin-icon-pinned")).toBe(
      true,
    );
  });

  it("标题栏图标组件从 Phosphor 图标库导入", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve("package.json"), "utf8"),
    );
    const appSource = readFileSync(
      resolve(RENDERER_SRC, "app/IdeaNotesApp.tsx"),
      "utf8",
    );
    const titlebarIcons = readFileSync(
      resolve(RENDERER_SRC, "components/titlebar/TitlebarIcons.tsx"),
      "utf8",
    );

    expect(packageJson.dependencies?.["@phosphor-icons/react"]).toBeTruthy();
    expect(titlebarIcons).toContain('from "@phosphor-icons/react"');
    expect(titlebarIcons).not.toContain("<svg");
    expect(titlebarIcons).not.toContain("<path");
    expect(titlebarIcons).not.toContain("<circle");
    expect(appSource).not.toContain("☰");
    expect(appSource).not.toContain("−");
    expect(appSource).not.toContain("□");
    expect(appSource).not.toContain("▢");
    expect(appSource).not.toContain("×");
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
    const appSource = readFileSync(
      resolve("src/renderer/src/app/IdeaNotesApp.tsx"),
      "utf8",
    );

    expect(appSource).toContain("ArrowCounterClockwiseIcon");
    expect(appSource).not.toContain("BroomIcon");
    expect(appSource).not.toContain("XCircleIcon");
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
      const prioritySelect = screen.getByLabelText(
        "优先级",
      ) as HTMLSelectElement;
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

      await user.click(screen.getByRole("button", { name: "重置" }));

      expect(searchInput.value).toBe("");
      expect(prioritySelect.value).toBe("all");
      expect(sortSelect.value).toBe("important");
      expect(workTagButton.classList.contains("selected")).toBe(false);
    },
  );

  it("按钮组件和样式集中维护 hover 与图标强度", () => {
    const appButtonPath = resolve(RENDERER_SRC, "components/ui/AppButton.tsx");
    const styles = readRendererStyles();
    const noteCompleteActionBlock = readCssRuleBlock(
      styles,
      ".note-complete-action",
    );
    const noteDeleteActionBlock = readCssRuleBlock(
      styles,
      ".note-delete-action",
    );
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
    expect(styles).toContain("width: 100px;");
    expect(styles).toContain("height: 40px;");
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
    const dialogShellPath = resolve(
      RENDERER_SRC,
      "components/dialogs/DialogShell.tsx",
    );
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
