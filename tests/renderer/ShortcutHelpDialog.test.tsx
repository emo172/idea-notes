/** @vitest-environment jsdom */
// 快捷键帮助弹窗测试。
// 作用：
// 1. 锁定弹窗通过 DialogShell 暴露的 dialog 语义和 Escape 关闭行为。
// 2. 验证当前已有快捷键按分类展示，并使用原生 kbd 元素呈现键位。
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ShortcutHelpDialog } from "../../src/renderer/src/components/dialogs/ShortcutHelpDialog";
import { appCopy } from "../../src/renderer/src/i18n";

describe("ShortcutHelpDialog", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("按分类展示现有快捷键并用 kbd 标记键位", () => {
    render(<ShortcutHelpDialog copy={appCopy["zh-CN"]} onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog", { name: "快捷键参考" });
    expect(within(dialog).getByRole("heading", { name: "导航" })).toBeTruthy();
    expect(within(dialog).getByRole("heading", { name: "编辑" })).toBeTruthy();
    expect(within(dialog).getByRole("heading", { name: "视图" })).toBeTruthy();

    const shortcuts = [
      "Ctrl/Cmd+N",
      "Ctrl/Cmd+S",
      "Ctrl/Cmd+F",
      "F1",
      "Ctrl/Cmd+/",
      "Ctrl/Cmd+1",
      "Ctrl/Cmd+2",
      "Ctrl/Cmd+3",
      "Ctrl/Cmd+4",
    ];
    for (const shortcut of shortcuts) {
      const key = within(dialog).getByText(shortcut);
      expect(key.tagName).toBe("KBD");
    }

    expect(
      within(dialog).getByText("已支持的快捷键，部分仅在对应界面可用。"),
    ).toBeTruthy();
    expect(within(dialog).getByText("保存当前编辑")).toBeTruthy();
    expect(within(dialog).getByText("聚焦搜索框")).toBeTruthy();
    expect(within(dialog).getAllByText("打开快捷键帮助")).toHaveLength(2);
    expect(within(dialog).getByText("在列表中可新建笔记")).toBeTruthy();
    expect(within(dialog).getByText("在列表中可切换到进行中视图")).toBeTruthy();
    expect(within(dialog).getByText("在列表中可切换到已完成视图")).toBeTruthy();
    expect(within(dialog).getByText("在列表中可切换到归档视图")).toBeTruthy();
    expect(within(dialog).getByText("在列表中可切换到回收站视图")).toBeTruthy();
  });

  it("按 Escape 时调用关闭回调", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<ShortcutHelpDialog copy={appCopy["zh-CN"]} onClose={onClose} />);

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("分类标题使用当前语言文案", () => {
    render(<ShortcutHelpDialog copy={appCopy.en} onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog", { name: "Keyboard shortcuts" });
    expect(within(dialog).getByRole("heading", { name: "Navigation" })).toBeTruthy();
    expect(within(dialog).getByRole("heading", { name: "Editing" })).toBeTruthy();
    expect(within(dialog).getByRole("heading", { name: "View" })).toBeTruthy();
  });

  it("英文环境下 intro 和每条说明使用英文且不出现简体中文", () => {
    render(<ShortcutHelpDialog copy={appCopy.en} onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog", { name: "Keyboard shortcuts" });
    expect(within(dialog).getByText(appCopy.en.shortcutIntro)).toBeTruthy();
    expect(within(dialog).queryByText(/current context/i)).toBeNull();

    for (const description of Object.values(appCopy.en.shortcutDescriptions)) {
      expect(within(dialog).getAllByText(description).length).toBeGreaterThan(0);
    }

    for (const simplifiedText of [
      "当前可用的全局快捷键。",
      "聚焦搜索框",
      "新建笔记",
      "保存当前编辑",
      "切换到进行中视图",
      "切换到已完成视图",
      "切换到归档视图",
      "切换到回收站视图",
      "当前情境中可用的快捷键。",
    ]) {
      expect(within(dialog).queryByText(simplifiedText)).toBeNull();
    }
  });

  it("繁体环境下 intro 和每条说明使用繁体且不出现简体中文", () => {
    render(<ShortcutHelpDialog copy={appCopy["zh-TW"]} onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog", { name: "快捷鍵參考" });
    expect(within(dialog).getByText(appCopy["zh-TW"].shortcutIntro)).toBeTruthy();

    for (const description of Object.values(appCopy["zh-TW"].shortcutDescriptions)) {
      expect(within(dialog).getAllByText(description).length).toBeGreaterThan(0);
    }

    for (const simplifiedText of [
      "当前可用的全局快捷键。",
      "聚焦搜索框",
      "新建笔记",
      "保存当前编辑",
      "切换到进行中视图",
      "切换到已完成视图",
      "切换到归档视图",
      "切换到回收站视图",
      "当前情境中可用的快捷键。",
    ]) {
      expect(within(dialog).queryByText(simplifiedText)).toBeNull();
    }
  });
});
