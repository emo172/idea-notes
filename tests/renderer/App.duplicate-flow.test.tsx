/** @vitest-environment jsdom */
// React 渲染层复制笔记流程测试。
// 作用：
// 1. 覆盖复制笔记会插入列表顶部的行为。
// 2. 覆盖不同语言下复制标题后缀的本地化规则。
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { BASE_TIME, installApi } from "./testUtils";

describe("App duplicate flow", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("复制笔记并把本地化副本插入列表顶部", async () => {
    const { api, saved } = installApi(getDefaultData(BASE_TIME));
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");
    await user.click(screen.getAllByRole("button", { name: "更多操作" })[0]);
    await user.click(screen.getByRole("menuitem", { name: "复制" }));

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    const copiedNote = saved.at(-1)?.notes[0];
    expect(saved.at(-1)?.notes[0]?.title).toBe("重构 Desktop App 导航栏 副本");
    expect(saved.at(-1)?.notes[1]?.title).toBe("重构 Desktop App 导航栏");
    expect(copiedNote?.checklist[0]?.id).toBe(`${copiedNote?.id}-item-1`);
    expect(copiedNote?.checklist.map((item) => item.checked)).toEqual([
      true,
      true,
      false,
      false,
    ]);
  });

  it.each([
    {
      language: "en" as const,
      title: "Desktop App navigation",
      moreActions: "More actions",
      duplicate: "Copy",
      expectedTitle: "Desktop App navigation Copy",
    },
    {
      language: "zh-TW" as const,
      title: "測試筆記",
      moreActions: "更多操作",
      duplicate: "複製",
      expectedTitle: "測試筆記 複本",
    },
  ])(
    "$language 复制笔记使用当前语言标题后缀",
    async ({ language, title, moreActions, duplicate, expectedTitle }) => {
      const data = getDefaultData(BASE_TIME);
      data.settings.language = language;
      data.notes = [
        {
          ...data.notes[0],
          id: `${language}-copy-source`,
          title,
        },
      ];
      const { api, saved } = installApi(data);
      const user = userEvent.setup();

      render(<App />);

      await screen.findByText(title);
      await user.click(screen.getByRole("button", { name: moreActions }));
      await user.click(screen.getByRole("menuitem", { name: duplicate }));

      await waitFor(() => expect(api.saveData).toHaveBeenCalled());
      expect(saved.at(-1)?.notes[0]?.title).toBe(expectedTitle);
    },
  );
});
