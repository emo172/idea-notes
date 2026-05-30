/** @vitest-environment jsdom */
// React 渲染层测试。
// 作用：
// 1. 使用 jsdom 模拟浏览器环境，避免启动真实 Electron 窗口。
// 2. 用假的 window.ideaNotes 验证 App 会从 preload API 加载数据。
// 3. 覆盖新建笔记的主交互路径，确认保存时会调用持久化 API。
// 4. 保证测试文件放在 tests/ 下，和 src/ 功能代码分开维护。
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultSettings, getDefaultData } from "@shared/defaultData";
import App from "../../src/renderer/src/app/IdeaNotesApp";
import { settingsCopy } from "../../src/renderer/src/i18n";
import type {
  DesktopWindowState,
  IdeaNotesApi,
  IdeaNotesData,
} from "@shared/types";

function installApi(data: IdeaNotesData): {
  api: IdeaNotesApi;
  saved: IdeaNotesData[];
} {
  // 渲染层测试用假的 preload API 代替 Electron，仍然验证真实 React 交互。
  const saved: IdeaNotesData[] = [];
  const windowState: DesktopWindowState = {
    isAlwaysOnTop: false,
    isMaximized: false,
  };
  const api: IdeaNotesApi = {
    getData: vi.fn(async () => data),
    saveData: vi.fn(async (nextData) => {
      saved.push(nextData);
      return nextData;
    }),
    minimizeWindow: vi.fn(async () => windowState),
    toggleMaximizeWindow: vi.fn(async () => ({
      ...windowState,
      isMaximized: true,
    })),
    closeWindow: vi.fn(async () => undefined),
    toggleAlwaysOnTop: vi.fn(async () => ({
      ...windowState,
      isAlwaysOnTop: true,
    })),
    setStartup: vi.fn(async (enabled) => enabled),
  };

  Object.defineProperty(window, "ideaNotes", {
    configurable: true,
    value: api,
  });

  return { api, saved };
}

function readRendererStyles(rendererSrc: string): string {
  const styleFiles = [
    "styles.css",
    "styles/base.css",
    "styles/buttons.css",
    "styles/layout.css",
    "styles/sidebar.css",
    "styles/toolbar.css",
    "styles/notes.css",
    "styles/dialogs.css",
    "styles/editor.css",
    "styles/settings.css",
  ];

  return styleFiles
    .map((file) => readFileSync(resolve(rendererSrc, file), "utf8"))
    .join("\n");
}

describe("App", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("加载本地数据并显示种子笔记", async () => {
    // 首屏必须从 preload API 加载数据，并展示默认的进行中笔记列表。
    installApi(getDefaultData(Date.parse("2026-05-29T08:00:00.000Z")));

    render(<App />);

    expect(await screen.findByText("重构 Desktop App 导航栏")).toBeTruthy();
    expect(screen.getByText("进行中")).toBeTruthy();
  });

  it("新建笔记后调用持久化 API", async () => {
    // 新建流程从点击按钮到保存，验证 UI 会把多行正文转成清单并持久化。
    const { api, saved } = installApi(
      getDefaultData(Date.parse("2026-05-29T08:00:00.000Z")),
    );
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "新建" }));
    await user.clear(screen.getByLabelText("标题"));
    await user.type(screen.getByLabelText("标题"), "桌面软件验收");
    await user.type(screen.getByLabelText("正文"), "创建窗口\n保存数据");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    expect(saved.at(-1)?.notes[0]?.title).toBe("桌面软件验收");
    expect(saved.at(-1)?.notes[0]?.checklist).toHaveLength(2);
  });

  it("按原型支持侧栏收起和展开", async () => {
    installApi(getDefaultData(Date.parse("2026-05-29T08:00:00.000Z")));
    const user = userEvent.setup();

    const { container } = render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");
    expect(container.querySelector(".app-body.sidebar-collapsed")).toBeNull();

    await user.click(screen.getByRole("button", { name: "收起/展开侧栏" }));
    expect(container.querySelector(".app-body.sidebar-collapsed")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "收起/展开侧栏" }));
    expect(container.querySelector(".app-body.sidebar-collapsed")).toBeNull();
  });

  it("使用全表面编辑器并通过返回按钮关闭", async () => {
    installApi(getDefaultData(Date.parse("2026-05-29T08:00:00.000Z")));
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "新建" }));
    expect(screen.getByPlaceholderText("输入标题...")).toBeTruthy();
    expect(screen.getByRole("button", { name: "返回" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "返回" }));
    expect(screen.queryByPlaceholderText("输入标题...")).toBeNull();
  });

  it("设置中心支持返回笔记列表", async () => {
    installApi(getDefaultData(Date.parse("2026-05-29T08:00:00.000Z")));
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    expect(screen.getByRole("heading", { name: "设置中心" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "返回" }));
    expect(await screen.findByText("重构 Desktop App 导航栏")).toBeTruthy();
  });

  it("标题栏置顶和设置按钮使用图标并保留可访问名称", async () => {
    installApi(getDefaultData(Date.parse("2026-05-29T08:00:00.000Z")));

    render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");
    const pinButton = screen.getByRole("button", { name: "始终置顶" });
    const settingsButton = screen.getByRole("button", { name: "设置" });

    expect(pinButton.querySelector("svg")).toBeTruthy();
    expect(settingsButton.querySelector("svg")).toBeTruthy();
    expect(pinButton.textContent?.trim()).toBe("");
    expect(settingsButton.textContent?.trim()).toBe("");
  });

  it("标题栏图标组件从 Phosphor 图标库导入", () => {
    const rendererSrc = resolve("src/renderer/src");
    const packageJson = JSON.parse(
      readFileSync(resolve("package.json"), "utf8"),
    );
    const appSource = readFileSync(
      resolve(rendererSrc, "app/IdeaNotesApp.tsx"),
      "utf8",
    );
    const titlebarIcons = readFileSync(
      resolve(rendererSrc, "components/titlebar/TitlebarIcons.tsx"),
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
    installApi(getDefaultData(Date.parse("2026-05-29T08:00:00.000Z")));
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
      name: "标签与设置",
    });
    const completeButton = screen.getAllByRole("button", {
      name: "标为完成",
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
    for (const label of ["返回", "保存"]) {
      const button = screen.getByRole("button", { name: label });
      expect(button.classList.contains("app-button")).toBe(true);
      expect(button.classList.contains("app-button-size-md")).toBe(true);
      expect(button.classList.contains("editor-action-button")).toBe(false);
      expect(button.querySelector(".app-button-icon svg")).toBeTruthy();
    }
  });

  it("按钮组件和样式集中维护 hover 与图标强度", () => {
    const rendererSrc = resolve("src/renderer/src");
    const appButtonPath = resolve(rendererSrc, "components/ui/AppButton.tsx");
    const styles = readRendererStyles(rendererSrc);
    const titlebarIcons = readFileSync(
      resolve(rendererSrc, "components/titlebar/TitlebarIcons.tsx"),
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
    expect(styles).not.toContain(".editor-action-button");
    expect(styles).not.toContain("width: 104px;");
    expect(styles).toContain("justify-content: flex-start;");
    expect(styles).toContain("margin-left: auto;");
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

  it("渲染层样式入口拆分为按职责维护的目录文件", () => {
    const rendererSrc = resolve("src/renderer/src");
    const styleEntry = readFileSync(resolve(rendererSrc, "styles.css"), "utf8");
    const styleFiles = [
      "base.css",
      "buttons.css",
      "layout.css",
      "sidebar.css",
      "toolbar.css",
      "notes.css",
      "dialogs.css",
      "editor.css",
      "settings.css",
    ];

    for (const file of styleFiles) {
      expect(existsSync(resolve(rendererSrc, "styles", file))).toBe(true);
      expect(styleEntry).toContain(`@import "./styles/${file}";`);
    }

    expect(styleEntry).not.toContain(".note-card {");
    expect(styleEntry).not.toContain(".settings-view {");
  });

  it("拆分后的样式模块不混入其他页面职责", () => {
    const rendererSrc = resolve("src/renderer/src");
    const sidebarStyles = readFileSync(
      resolve(rendererSrc, "styles/sidebar.css"),
      "utf8",
    );
    const toolbarStyles = readFileSync(
      resolve(rendererSrc, "styles/toolbar.css"),
      "utf8",
    );
    const noteStyles = readFileSync(
      resolve(rendererSrc, "styles/notes.css"),
      "utf8",
    );
    const editorStyles = readFileSync(
      resolve(rendererSrc, "styles/editor.css"),
      "utf8",
    );

    expect(sidebarStyles).not.toContain(".notes-list");
    expect(sidebarStyles).not.toContain(".tag-picker");
    expect(sidebarStyles).not.toContain(".tag-manager-list");
    expect(toolbarStyles).not.toContain(".form-field");
    expect(toolbarStyles).not.toContain(".setting-row");
    expect(noteStyles).not.toContain(".settings-actions");
    expect(noteStyles).not.toContain(".editor-head");
    expect(noteStyles).not.toContain(".tag-add-row");
    expect(editorStyles).not.toContain(".settings-head");
    expect(editorStyles).not.toContain(".settings-main");
  });

  it("标签设置页支持内联新增和重命名标签", async () => {
    const { api, saved } = installApi(
      getDefaultData(Date.parse("2026-05-29T08:00:00.000Z")),
    );
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "标签与设置" }));
    expect(screen.getByRole("heading", { name: "标签设置" })).toBeTruthy();
    expect(
      screen.getByText(
        "管理全局标签库，变更会同步到左侧筛选和编辑页标签选择。",
      ),
    ).toBeTruthy();

    await user.type(
      screen.getByPlaceholderText("输入新标签名称"),
      "阅读{Enter}",
    );
    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    expect(saved.at(-1)?.tags).toContain("阅读");

    const workTagInput = screen.getByDisplayValue("工作");
    await user.clear(workTagInput);
    await user.type(workTagInput, "项目");
    await user.tab();

    await waitFor(() => expect(saved.at(-1)?.tags).toContain("项目"));
    expect(saved.at(-1)?.tags).not.toContain("工作");
    expect(saved.at(-1)?.notes[0]?.tags).toContain("项目");
  });

  it("标签设置按原型在主内容区展示并拒绝重命名为已有标签", async () => {
    const { api } = installApi(
      getDefaultData(Date.parse("2026-05-29T08:00:00.000Z")),
    );
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "标签与设置" }));
    const tagSettings = screen.getByRole("region", { name: "标签设置" });
    expect(tagSettings).toBeTruthy();
    expect(tagSettings.classList.contains("scrollable-panel")).toBe(true);
    expect(screen.queryByRole("region", { name: "进行中" })).toBeNull();
    expect(screen.queryByRole("region", { name: "设置" })).toBeNull();
    expect(screen.getByPlaceholderText("输入新标签名称")).toBe(
      document.activeElement,
    );

    const workTagInput = screen.getByDisplayValue("工作");
    await user.clear(workTagInput);
    await user.type(workTagInput, "灵感");
    await user.tab();

    expect(api.saveData).not.toHaveBeenCalled();
  });

  it("设置中心使用外观和系统页签并支持重置设置", async () => {
    const data = getDefaultData(Date.parse("2026-05-29T08:00:00.000Z"));
    data.settings = {
      themeMode: "dark",
      backgroundColor: "#111827",
      startup: true,
      trashAutoDelete: "30",
      language: "zh-CN",
    };
    const { api, saved } = installApi(data);
    api.setStartup = vi.fn(async () => true);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    expect(screen.getByRole("heading", { name: "外观设置" })).toBeTruthy();
    expect(screen.getByText("设置界面的默认明暗显示方式")).toBeTruthy();
    expect(screen.getByText("统一调整笔记页、设置页和面板背景")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "系统设置" }));
    expect(screen.getByRole("heading", { name: "系统设置" })).toBeTruthy();
    expect(screen.getByText("系统登录后自动启动 Idea Notes")).toBeTruthy();
    expect(screen.getByText("到期后自动清理回收站中的笔记")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "外观设置" }));
    await user.click(screen.getByRole("button", { name: "重置" }));

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    expect(confirmSpy).toHaveBeenCalledWith("确认重置所有设置？");
    expect(api.setStartup).toHaveBeenCalledWith(defaultSettings.startup);
    expect(saved.at(-1)?.settings).toEqual({
      ...defaultSettings,
      startup: true,
    });
  });

  it("语言设置会立即切换设置页文案并持久化", async () => {
    const { api, saved } = installApi(
      getDefaultData(Date.parse("2026-05-29T08:00:00.000Z")),
    );
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    await user.click(screen.getByRole("button", { name: "系统设置" }));
    const languageSelect = screen.getByRole("combobox", {
      name: /语言/,
    }) as HTMLSelectElement;
    expect(
      Array.from(languageSelect.options).map((option) => option.text),
    ).toEqual(["简体中文", "繁體中文", "English"]);
    await user.selectOptions(languageSelect, "en");

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    expect(saved.at(-1)?.settings.language).toBe("en");
    expect(document.documentElement.lang).toBe("en");
    expect(
      screen.getByRole("heading", { name: "System Settings" }),
    ).toBeTruthy();
    const updatedLanguageSelect = screen.getByRole("combobox", {
      name: /Language/,
    }) as HTMLSelectElement;
    expect(
      Array.from(updatedLanguageSelect.options).map((option) => option.text),
    ).toEqual(["简体中文", "繁體中文", "English"]);
    expect(screen.queryByText("Simplified Chinese")).toBeNull();
    expect(screen.queryByText("Traditional Chinese")).toBeNull();
    expect(screen.getByText("Language")).toBeTruthy();
    expect(screen.getByText("Switch the display language")).toBeTruthy();
  });

  it("语言切换后重置确认使用当前语言", async () => {
    const { api } = installApi(
      getDefaultData(Date.parse("2026-05-29T08:00:00.000Z")),
    );
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    await user.click(screen.getByRole("button", { name: "系统设置" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: /语言/ }),
      "en",
    );
    await waitFor(() => expect(api.saveData).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(confirmSpy).toHaveBeenCalledWith("Reset all settings?");
  });

  it("设置加载态文案集中在多语言配置中", () => {
    expect("loadingSettings" in settingsCopy["zh-CN"]).toBe(true);
    expect("loadingSettings" in settingsCopy["zh-TW"]).toBe(true);
    expect("loadingSettings" in settingsCopy.en).toBe(true);
  });

  it("多语言文案按每种语言独立文件维护", () => {
    const rendererSrc = resolve("src/renderer/src");
    const i18nDir = resolve("src/renderer/src/i18n");

    expect(existsSync(resolve(rendererSrc, "app/IdeaNotesApp.tsx"))).toBe(true);
    expect(existsSync(resolve(rendererSrc, "App.tsx"))).toBe(false);
    expect(
      existsSync(resolve(rendererSrc, "components/titlebar/TitlebarIcons.tsx")),
    ).toBe(true);
    expect(existsSync(resolve(rendererSrc, "components/icons.tsx"))).toBe(
      false,
    );
    expect(existsSync(resolve(rendererSrc, "utils/noteDraft.ts"))).toBe(true);
    expect(existsSync(resolve(rendererSrc, "utils/dateFormatting.ts"))).toBe(
      true,
    );
    expect(existsSync(resolve(rendererSrc, "utils/noteHelpers.ts"))).toBe(
      false,
    );
    expect(existsSync(resolve(i18nDir, "zh-CN.ts"))).toBe(true);
    expect(existsSync(resolve(i18nDir, "zh-TW.ts"))).toBe(true);
    expect(existsSync(resolve(i18nDir, "en.ts"))).toBe(true);
    expect(existsSync(resolve(i18nDir, "copy.ts"))).toBe(false);
  });

  it("语言设置会同步标题栏、侧栏、工具栏、编辑器和标签设置文案", async () => {
    const { api } = installApi(
      getDefaultData(Date.parse("2026-05-29T08:00:00.000Z")),
    );
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    await user.click(screen.getByRole("button", { name: "系统设置" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: /语言/ }),
      "en",
    );
    await waitFor(() => expect(api.saveData).toHaveBeenCalled());

    expect(screen.getByRole("button", { name: "Always on top" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Settings" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("button", { name: /In Progress/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Completed/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Trash/ })).toBeTruthy();
    expect(screen.getByText("Tag Filter")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tag Settings" })).toBeTruthy();
    expect(screen.getByText("Search")).toBeTruthy();
    expect(screen.getByPlaceholderText("Search title or body")).toBeTruthy();
    expect(screen.getByText("Priority")).toBeTruthy();
    expect(screen.getByText("Sort")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Clear" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "New" }));
    expect(screen.getByRole("heading", { name: "New Note" })).toBeTruthy();
    expect(screen.getByLabelText("Title")).toBeTruthy();
    expect(screen.getByPlaceholderText("Enter title...")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Back" }));

    await user.click(screen.getByRole("button", { name: "Tag Settings" }));
    expect(screen.getByRole("heading", { name: "Tag Settings" })).toBeTruthy();
    expect(screen.getByPlaceholderText("New tag name")).toBeTruthy();
  });

  it("开机自启动使用开关并保存主进程返回值", async () => {
    const data = getDefaultData(Date.parse("2026-05-29T08:00:00.000Z"));
    data.settings.startup = false;
    const { api, saved } = installApi(data);
    api.setStartup = vi.fn(async () => false);
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "设置" }));
    await user.click(screen.getByRole("button", { name: "系统设置" }));
    const startupSwitch = screen.getByRole("checkbox", { name: /启动行为/ });

    expect(startupSwitch.closest(".switch")).toBeTruthy();
    await user.click(startupSwitch);

    await waitFor(() => expect(api.setStartup).toHaveBeenCalledWith(true));
    expect(saved.at(-1)?.settings.startup).toBe(false);
  });

  it("复制笔记并把副本插入列表顶部", async () => {
    const { api, saved } = installApi(
      getDefaultData(Date.parse("2026-05-29T08:00:00.000Z")),
    );
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");
    await user.click(screen.getAllByRole("button", { name: "更多操作" })[0]);
    await user.click(screen.getByRole("menuitem", { name: "复制" }));

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    expect(saved.at(-1)?.notes[0]?.title).toBe("重构 Desktop App 导航栏 副本");
    expect(saved.at(-1)?.notes[1]?.title).toBe("重构 Desktop App 导航栏");
  });

  it("笔记卡片底部只保留完成和删除按钮", async () => {
    installApi(getDefaultData(Date.parse("2026-05-29T08:00:00.000Z")));

    render(<App />);

    const title = await screen.findByText("重构 Desktop App 导航栏");
    const card = title.closest("article");
    expect(card).toBeTruthy();
    const actions = (card as HTMLElement).querySelector(".card-actions");
    expect(actions).toBeTruthy();

    expect(
      within(actions as HTMLElement).getByRole("button", { name: "标为完成" }),
    ).toBeTruthy();
    expect(
      within(actions as HTMLElement).getByRole("button", { name: "删除" }),
    ).toBeTruthy();
    expect(
      within(actions as HTMLElement).queryByRole("button", { name: "复制" }),
    ).toBeNull();
    expect((actions as HTMLElement).querySelectorAll("button")).toHaveLength(2);
  });

  it("笔记卡片按原型避免正文和清单重复", async () => {
    installApi(getDefaultData(Date.parse("2026-05-29T08:00:00.000Z")));

    render(<App />);

    const checklistTitle = await screen.findByText("重构 Desktop App 导航栏");
    const checklistCard = checklistTitle.closest("article");
    expect(checklistCard).toBeTruthy();
    expect(
      (checklistCard as HTMLElement).querySelector(".note-body-preview"),
    ).toBeNull();
    expect(
      within(checklistCard as HTMLElement).getByText("实现可拖拽的 Titlebar"),
    ).toBeTruthy();

    const bodyTitle = screen.getByText("产品命名灵感");
    const bodyCard = bodyTitle.closest("article");
    expect(bodyCard).toBeTruthy();
    const bodyPreview = (bodyCard as HTMLElement).querySelector(
      ".note-body-preview",
    );
    expect(bodyPreview?.textContent).toContain("Idea Notes");
  });

  it("笔记卡片状态和截止时间标签显示图标", async () => {
    installApi(getDefaultData(Date.parse("2026-05-29T08:00:00.000Z")));

    render(<App />);

    const title = await screen.findByText("重构 Desktop App 导航栏");
    const card = title.closest("article");
    expect(card).toBeTruthy();
    const meta = (card as HTMLElement).querySelector(".note-meta");
    expect(meta).toBeTruthy();

    expect(within(meta as HTMLElement).getByText(/状态：进行中/)).toBeTruthy();
    expect(
      within(meta as HTMLElement).getByText(/截止时间：5月24日/),
    ).toBeTruthy();
    expect((meta as HTMLElement).querySelectorAll("svg")).toHaveLength(2);
  });

  it("笔记卡片按原型提供编辑按钮和更多操作菜单", async () => {
    const { api, saved } = installApi(
      getDefaultData(Date.parse("2026-05-29T08:00:00.000Z")),
    );
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText("重构 Desktop App 导航栏");
    await user.click(screen.getAllByRole("button", { name: "编辑笔记" })[0]);
    expect(screen.getByRole("heading", { name: "编辑笔记" })).toBeTruthy();
    expect(screen.getByDisplayValue("重构 Desktop App 导航栏")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "返回" }));

    await user.click(screen.getAllByRole("button", { name: "更多操作" })[0]);
    const menu = screen.getByRole("menu", { name: "更多操作" });
    for (const label of ["编辑", "完成", "复制", "删除"]) {
      expect(within(menu).getByRole("menuitem", { name: label })).toBeTruthy();
    }

    await user.click(within(menu).getByRole("menuitem", { name: "复制" }));

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    expect(saved.at(-1)?.notes[0]?.title).toBe("重构 Desktop App 导航栏 副本");
    expect(screen.queryByRole("menu", { name: "更多操作" })).toBeNull();
  });

  it("已完成笔记只在更多菜单展示恢复和删除且不能编辑", async () => {
    const completedData = getDefaultData(
      Date.parse("2026-05-29T08:00:00.000Z"),
    );
    completedData.notes = [
      {
        ...completedData.notes[0],
        status: "completed",
      },
      completedData.notes[1],
    ];
    const { api } = installApi(completedData);
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: /已完成/ }));
    const title = await screen.findByText("重构 Desktop App 导航栏");
    const card = title.closest("article");
    expect(card).toBeTruthy();
    expect(
      within(card as HTMLElement).queryByRole("button", { name: "编辑笔记" }),
    ).toBeNull();
    expect(
      within(card as HTMLElement).queryByRole("button", {
        name: "重构 Desktop App 导航栏",
      }),
    ).toBeNull();
    const checklistInput = within(card as HTMLElement).getByRole("checkbox", {
      name: "增加始终置顶按钮",
    }) as HTMLInputElement;
    expect(checklistInput.disabled).toBe(true);
    await user.click(checklistInput);
    expect(api.saveData).not.toHaveBeenCalled();

    await user.click(
      within(card as HTMLElement).getByRole("button", { name: "更多操作" }),
    );
    const menu = screen.getByRole("menu", { name: "更多操作" });

    expect(within(menu).getByRole("menuitem", { name: "恢复" })).toBeTruthy();
    expect(within(menu).getByRole("menuitem", { name: "删除" })).toBeTruthy();
    expect(within(menu).queryByRole("menuitem", { name: "编辑" })).toBeNull();
    expect(within(menu).queryByRole("menuitem", { name: "完成" })).toBeNull();
    expect(within(menu).queryByRole("menuitem", { name: "复制" })).toBeNull();
  });

  it("更多操作菜单按笔记状态展示恢复和彻底删除", async () => {
    const trashData = getDefaultData(Date.parse("2026-05-29T08:00:00.000Z"));
    trashData.notes = [
      {
        ...trashData.notes[0],
        status: "trash",
        trashedAt: Date.parse("2026-05-29T09:00:00.000Z"),
      },
      trashData.notes[1],
    ];
    const { api } = installApi(trashData);
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: /回收站/ }));
    const title = await screen.findByText("重构 Desktop App 导航栏");
    const card = title.closest("article");
    expect(card).toBeTruthy();
    expect(
      within(card as HTMLElement).queryByRole("button", { name: "编辑笔记" }),
    ).toBeNull();
    expect(
      within(card as HTMLElement).queryByRole("button", {
        name: "重构 Desktop App 导航栏",
      }),
    ).toBeNull();
    const checklistInput = within(card as HTMLElement).getByRole("checkbox", {
      name: "增加始终置顶按钮",
    }) as HTMLInputElement;
    expect(checklistInput.disabled).toBe(true);
    await user.click(checklistInput);
    expect(api.saveData).not.toHaveBeenCalled();

    await user.click(
      within(card as HTMLElement).getByRole("button", { name: "更多操作" }),
    );
    const menu = screen.getByRole("menu", { name: "更多操作" });

    expect(within(menu).getByRole("menuitem", { name: "恢复" })).toBeTruthy();
    expect(
      within(menu).getByRole("menuitem", { name: "彻底删除" }),
    ).toBeTruthy();
    expect(within(menu).queryByRole("menuitem", { name: "编辑" })).toBeNull();
    expect(within(menu).queryByRole("menuitem", { name: "复制" })).toBeNull();

    await user.click(within(menu).getByRole("menuitem", { name: "彻底删除" }));

    expect(screen.getByRole("dialog", { name: "确认彻底删除？" })).toBeTruthy();
  });

  it("彻底删除回收站笔记前要求确认", async () => {
    const trashData = getDefaultData(Date.parse("2026-05-29T08:00:00.000Z"));
    trashData.notes = [
      {
        ...trashData.notes[0],
        status: "trash",
        trashedAt: Date.parse("2026-05-29T09:00:00.000Z"),
      },
      trashData.notes[1],
    ];
    const { api, saved } = installApi(trashData);
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: /回收站/ }));
    await user.click(screen.getByRole("button", { name: "彻底删除" }));
    expect(screen.getByRole("dialog", { name: "确认彻底删除？" })).toBeTruthy();
    expect(api.saveData).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.queryByRole("dialog", { name: "确认彻底删除？" })).toBeNull();
    expect(api.saveData).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "彻底删除" }));
    await user.click(screen.getByRole("button", { name: "确认删除" }));

    await waitFor(() => expect(api.saveData).toHaveBeenCalled());
    expect(saved.at(-1)?.notes.map((note) => note.id)).not.toContain(
      "seed-navigation",
    );
  });
});
