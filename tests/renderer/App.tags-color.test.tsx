/** @vitest-environment jsdom */
// React 渲染层标签颜色测试。
// 作用：
// 1. 覆盖标签颜色输入保存。
// 2. 验证保存后的颜色在侧栏、卡片和编辑器中保持一致。
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { BASE_TIME, installApi } from "./testUtils";

describe("App tags color", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("标签颜色保存后在侧栏、卡片和编辑器中保持一致", async () => {
    const { api, saved } = installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "标签设置" }));
    const workColorInput = screen.getByLabelText("标签颜色 工作");
    expect(workColorInput).toHaveProperty("type", "color");
    fireEvent.change(workColorInput, { target: { value: "#10b981" } });

    expect(api.saveData).not.toHaveBeenCalled();
    fireEvent.blur(workColorInput);

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    expect(saved.at(-1)?.tags.find((tag) => tag.name === "工作")?.color).toBe(
      "#10b981",
    );

    const workSidebarTag = screen.getByRole("button", { name: "#工作" });
    expect(workSidebarTag.getAttribute("style")).toContain("--tag-color: #10b981");

    await user.click(screen.getByRole("button", { name: /进行中/ }));
    const card = (await screen.findByText("重构 Desktop App 导航栏")).closest(
      "article",
    ) as HTMLElement;
    const cardTag = within(card).getByText("#工作");
    expect(cardTag.getAttribute("style")).toContain("--tag-color: #10b981");

    await user.click(screen.getAllByRole("button", { name: "编辑笔记" })[0]);
    const editor = screen.getByRole("dialog", { name: "编辑笔记" });
    const editorTag = within(editor).getByRole("button", { name: "#工作" });
    expect(editorTag.getAttribute("style")).toContain("--tag-color: #10b981");
  });
});
