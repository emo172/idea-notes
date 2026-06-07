/** @vitest-environment jsdom */
// React 渲染层工具栏控件测试。
// 作用：
// 1. 覆盖关键按钮统一组件和筛选重置按钮图标契约。
// 2. 验证不同视图下筛选重置会清空搜索、优先级、排序和标签。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import type { NoteStatus } from "@shared/types";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { BASE_TIME, installApi } from "./testUtils";

describe("App toolbar controls", () => {
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
});
