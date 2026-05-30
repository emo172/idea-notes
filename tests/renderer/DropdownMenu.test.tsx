/** @vitest-environment jsdom */
// 下拉菜单组件测试。
// 作用：
// 1. 锁定通用下拉按钮的可访问状态和菜单角色。
// 2. 验证 Escape、外部点击和菜单动作都会关闭浮层。
// 3. 让笔记卡片重构前先拥有可复用组件的行为契约。
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DotsThreeIcon } from "@phosphor-icons/react";
import { DropdownButton } from "../../src/renderer/src/components/ui/dropdown/DropdownButton";
import { DropdownMenu } from "../../src/renderer/src/components/ui/dropdown/DropdownMenu";

describe("DropdownButton", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("点击按钮后展示菜单并用 Escape 关闭", async () => {
    const user = userEvent.setup();

    render(
      <DropdownButton
        buttonClassName="note-icon-btn"
        icon={<DotsThreeIcon weight="bold" />}
        label="更多操作"
      >
        <DropdownMenu label="更多操作">
          <button type="button" role="menuitem">
            复制
          </button>
        </DropdownMenu>
      </DropdownButton>,
    );

    const button = screen.getByRole("button", { name: "更多操作" });
    expect(button.getAttribute("aria-expanded")).toBe("false");

    await user.click(button);

    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("menu", { name: "更多操作" })).toBeTruthy();

    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByRole("menu", { name: "更多操作" })).toBeNull(),
    );
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });

  it("点击外部或菜单项后关闭菜单", async () => {
    const user = userEvent.setup();
    const onDuplicate = vi.fn();

    render(
      <div>
        <DropdownButton icon={<DotsThreeIcon weight="bold" />} label="更多操作">
          <DropdownMenu label="更多操作">
            <button type="button" role="menuitem" onClick={onDuplicate}>
              复制
            </button>
          </DropdownMenu>
        </DropdownButton>
        <button type="button">外部按钮</button>
      </div>,
    );

    await user.click(screen.getByRole("button", { name: "更多操作" }));
    await user.click(screen.getByRole("button", { name: "外部按钮" }));
    expect(screen.queryByRole("menu", { name: "更多操作" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "更多操作" }));
    const menu = screen.getByRole("menu", { name: "更多操作" });
    await user.click(within(menu).getByRole("menuitem", { name: "复制" }));

    expect(onDuplicate).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu", { name: "更多操作" })).toBeNull();
  });
});
