/** @vitest-environment jsdom */
// 通用弹窗外壳测试。
// 作用：
// 1. 锁定弹窗打开后的初始焦点与键盘关闭行为。
// 2. 验证 Tab 焦点循环只在弹窗内部移动。
// 3. 覆盖弹窗关闭后把焦点还给触发控件的可访问性约定。
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { DialogShell } from "../../src/renderer/src/components/dialogs/DialogShell";
import { BASE_TIME, installApi } from "./testUtils";

function renderDialog(onEscape = vi.fn()): void {
  render(
    <DialogShell
      title="确认操作"
      titleId="dialog-title"
      onEscape={onEscape}
      actions={
        <>
          <button type="button">取消</button>
          <button type="button">确认</button>
        </>
      }
    >
      <input aria-label="弹窗输入" />
    </DialogShell>,
  );
}

function DialogHost(): ReactElement {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>
        打开弹窗
      </button>
      {isOpen ? (
        <DialogShell
          title="确认操作"
          titleId="dialog-title"
          onEscape={() => setIsOpen(false)}
          actions={<button type="button">确认</button>}
        >
          <button type="button" onClick={() => setIsOpen(false)}>
            取消
          </button>
        </DialogShell>
      ) : null}
    </>
  );
}

describe("DialogShell", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("打开后把焦点放到弹窗内第一个可聚焦元素", () => {
    renderDialog();

    expect(screen.getByLabelText("弹窗输入")).toBe(document.activeElement);
  });

  it("没有可聚焦元素时把焦点放到弹窗面板", () => {
    render(
      <DialogShell
        title="只读提示"
        titleId="readonly-dialog-title"
        actions={<span>无操作</span>}
      >
        <p>当前弹窗没有按钮或输入框。</p>
      </DialogShell>,
    );

    expect(screen.getByRole("dialog", { name: "只读提示" })).toBe(
      document.activeElement,
    );
  });

  it("按 Escape 时调用弹窗关闭回调", async () => {
    const user = userEvent.setup();
    const onEscape = vi.fn();

    renderDialog(onEscape);

    await user.keyboard("{Escape}");

    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("Tab 和 Shift+Tab 在弹窗内部循环焦点", async () => {
    const user = userEvent.setup();

    renderDialog();

    const input = screen.getByLabelText("弹窗输入");
    const cancelButton = screen.getByRole("button", { name: "取消" });
    const confirmButton = screen.getByRole("button", { name: "确认" });

    expect(input).toBe(document.activeElement);

    await user.tab();
    expect(cancelButton).toBe(document.activeElement);

    await user.tab();
    expect(confirmButton).toBe(document.activeElement);

    await user.tab();
    expect(input).toBe(document.activeElement);

    await user.tab({ shift: true });
    expect(confirmButton).toBe(document.activeElement);
  });

  it("关闭弹窗后把焦点恢复到打开弹窗的按钮", async () => {
    const user = userEvent.setup();

    render(<DialogHost />);

    const triggerButton = screen.getByRole("button", { name: "打开弹窗" });
    await user.click(triggerButton);
    expect(screen.getByRole("dialog")).toBeTruthy();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(triggerButton).toBe(document.activeElement);
  });

  it("应用快捷键中 Escape 优先关闭当前确认弹窗", async () => {
    const data = getDefaultData(BASE_TIME);
    data.notes = [
      {
        ...data.notes[0],
        id: "shortcut-trash-note",
        title: "快捷键删除目标",
        status: "trash",
        trashedAt: BASE_TIME,
      },
    ];
    installApi(data);
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: /回收站/ }));
    await user.click(screen.getByRole("button", { name: "删除" }));
    expect(screen.getByRole("dialog", { name: "确认彻底删除？" })).toBeTruthy();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "确认彻底删除？" })).toBeNull();
    expect(await screen.findByText("快捷键删除目标")).toBeTruthy();
  });
});
