# idea-notes

灵感笔记是一个基于 Electron + React + TypeScript 的桌面应用，用于本地管理笔记、标签、清单、优先级、截止时间、回收站和应用设置。数据默认保存在本机 Electron `userData` 目录，适合离线使用和个人知识管理。

## 项目定位

- 桌面端：Electron 主进程提供窗口、IPC、本地存储和系统能力。
- 渲染端：React 渲染层负责笔记列表、编辑器、设置中心和交互状态。
- 共享层：`src/shared/` 存放 main、preload、renderer 和 tests 共用的类型与纯业务逻辑。
- 测试优先：项目用 Vitest 覆盖共享逻辑、主进程、preload 和渲染层交互。

## 环境要求

- Node.js：建议使用当前项目 lockfile 对应的现代 Node 版本；本地环境已验证 Node 24 可运行测试和构建。
- npm：本地开发可用 `npm install`，CI 和复现锁定依赖时使用 `npm ci`。
- Linux 桌面开发：项目脚本已通过 `NO_SANDBOX=1` 规避常见 sandbox 启动问题；部分环境仍可能遇到 Electron GPU/network service 报错，详见“本地运行提示”。

## 快速开始

```bash
npm install
npm run dev
```

开发服务器启动后，Electron 会加载 Vite renderer 页面。首次启动时，应用会生成默认示例数据，方便直接查看笔记、标签、清单和进度条效果。

## 常用命令

| 命令                                         | 用途                                                 |
| -------------------------------------------- | ---------------------------------------------------- |
| `npm install`                                | 安装项目依赖                                         |
| `npm ci`                                     | 按 `package-lock.json` 干净安装依赖                  |
| `npm run dev`                                | 启动 Electron + Vite 开发环境                        |
| `npm run typecheck`                          | 运行 TypeScript 类型检查                             |
| `npm run lint`                               | 运行 ESLint 静态检查                                 |
| `npm run format:check`                       | 检查 Prettier 格式                                   |
| `npm run format`                             | 使用 Prettier 格式化源码、测试和文档                 |
| `npm test`                                   | 运行全部 Vitest 测试                                 |
| `npm test -- tests/shared/noteLogic.test.ts` | 只运行共享业务逻辑测试                               |
| `npm test -- tests/main`                     | 只运行主进程相关测试                                 |
| `npm test -- tests/preload`                  | 只运行 preload 契约测试                              |
| `npm test -- tests/renderer`                 | 只运行渲染层测试                                     |
| `npm run build`                              | 生成生产构建，输出到 `out/`                          |
| `npm run smoke`                              | 检查已生成的生产构建关键产物                         |
| `npm run ci`                                 | 依次运行类型检查、lint、格式检查、测试、构建和 smoke |
| `npm run preview`                            | 预览构建结果                                         |
| `npm run package`                            | 先构建，再生成 `release/` 目录包                     |
| `npm run package:mac`                        | 生成 macOS `dmg` 安装包                              |
| `npm run package:win`                        | 生成 Windows `nsis` 安装包                           |
| `npm run package:linux`                      | 生成 Linux `AppImage` 安装包                         |
| `npm run package:all`                        | 按当前构建环境支持情况生成多平台安装包               |

## 详细项目目录结构

```text
idea-notes/
├── AGENTS.md                         # OpenCode 项目规则：代理协作、测试策略、边界约束
├── README.md                         # 团队上手、目录结构、命令和维护说明
├── CONTRIBUTING.md                    # 协作流程、PR 要求和验证说明
├── RELEASE.md                        # 打包和发布流程说明
├── package.json                      # npm 脚本、依赖、Electron 入口和桌面标识
├── package-lock.json                 # npm 依赖锁定文件
├── tsconfig.json                     # TypeScript 编译选项和 @shared 路径别名
├── electron.vite.config.ts           # main/preload/renderer 三端构建配置
├── electron-builder.yml              # 桌面应用打包配置
├── vitest.config.ts                  # Vitest 测试解析配置
├── eslint.config.js                  # ESLint 扁平配置
├── .prettierrc.json                  # Prettier 格式化配置
├── .prettierignore                   # Prettier 忽略规则
├── build/
│   └── icons/                        # 桌面应用图标资源，打包和本地窗口会引用
├── .github/
│   ├── workflows/ci.yml              # GitHub Actions：typecheck、lint、format、test、build、smoke
│   └── pull_request_template.md      # PR 检查清单
├── docs/                             # 本地计划和会话资料，默认不作为发布文档
├── out/                              # electron-vite 构建产物，禁止手动编辑
├── release/                          # electron-builder 输出目录包和安装包
├── src/
│   ├── main/
│   │   ├── index.ts                  # Electron 主进程启动编排
│   │   ├── ipc/registerIpc.ts        # IPC handler 注册和来源校验
│   │   ├── platform/linuxStartup.ts  # Linux 开发启动开关
│   │   ├── startup/loginItems.ts     # 开机自启动系统 API 封装
│   │   ├── window/createMainWindow.ts # 主窗口创建和窗口状态
│   │   ├── store.ts                  # 本地 JSON 存储读写入口
│   │   └── store/
│   │       ├── normalizeData.ts      # 旧数据迁移和归一化
│   │       └── writeJsonFile.ts      # 临时文件 + rename 安全写入
│   ├── preload/
│   │   └── index.ts                  # preload 桥接层：只暴露 window.ideaNotes 固定 API
│   ├── renderer/
│   │   └── src/
│   │       ├── main.tsx              # React 挂载入口
│   │       ├── styles.css            # 全局样式入口，只按顺序导入 styles/ 模块
│   │       ├── app/
│   │       │   ├── IdeaNotesApp.tsx  # 渲染层主组件：状态来源和接线
│   │       │   ├── AppMainContent.tsx # 主内容组合：标签设置、工具栏、列表
│   │       │   └── AppOverlays.tsx   # 设置页、编辑器和确认弹窗覆盖层
│   │       ├── components/
│   │       │   ├── dialogs/          # 确认对话框等弹层组件
│   │       │   ├── editor/           # 全表面笔记编辑器及字段/侧栏/动作子组件
│   │       │   ├── feedback/         # 保存反馈等通用反馈组件
│   │       │   ├── notes/            # 笔记卡片、清单预览、卡片菜单相关组件
│   │       │   ├── settings/         # 设置中心和标签设置面板
│   │       │   ├── shell/            # 自定义标题栏和侧边栏外壳
│   │       │   ├── titlebar/         # 自定义标题栏图标组件
│   │       │   ├── toolbar/          # 搜索、筛选、排序工具栏
│   │       │   └── ui/               # 通用按钮、下拉菜单等 UI 组件
│   │       ├── hooks/                # 数据、筛选、窗口、命令、焦点陷阱等 hook
│   │       ├── i18n/
│   │       │   ├── en.ts             # 英文文案
│   │       │   ├── zh-CN.ts          # 简体中文文案
│   │       │   ├── zh-TW.ts          # 繁体中文文案
│   │       │   ├── index.ts          # 文案导出入口
│   │       │   └── types.ts          # 文案字段类型契约
│   │       ├── styles/
│   │       │   ├── base.css          # 设计 token、主题变量、全局基础样式
│   │       │   ├── buttons.css       # 通用按钮样式
│   │       │   ├── dropdown.css      # 通用下拉菜单样式
│   │       │   ├── layout.css        # 应用窗口、标题栏、主体布局
│   │       │   ├── sidebar.css       # 侧栏、导航、标签筛选样式
│   │       │   ├── toolbar.css       # 搜索、筛选、排序工具栏样式
│   │       │   ├── notes-list.css    # 笔记列表滚动区样式
│   │       │   ├── note-card.css     # 笔记卡片容器、标题、标签和状态样式
│   │       │   ├── checklist-preview.css # 清单预览样式
│   │       │   ├── note-actions.css  # 卡片动作样式
│   │       │   ├── dialogs.css       # 确认弹窗样式
│   │       │   ├── editor.css        # 编辑器布局和输入区样式
│   │       │   └── settings.css      # 设置中心和设置项样式
│   │       └── utils/
│   │           ├── dateFormatting.ts # 渲染层日期格式化工具
│   │           └── noteDraft.ts      # 笔记与编辑草稿之间的转换工具
│   └── shared/
│       ├── defaultData.ts            # 首次启动种子数据和默认设置
│       ├── ideaNotesDataValidation.ts # IdeaNotesData 运行时结构校验
│       ├── noteLogic.ts              # shared 纯逻辑兼容聚合导出入口
│       ├── notes/                    # 清单、筛选、创建/复制、回收站纯逻辑
│       ├── settings/                 # 设置更新纯逻辑
│       ├── tags/                     # 标签重命名和删除纯逻辑
│       └── types.ts                  # 主进程、preload、renderer、tests 共享类型
└── tests/
    ├── main/
    │   ├── packaging-config.test.ts  # 跨平台打包脚本、安装包目标和桌面图标配置
    │   ├── window-config.test.ts     # 主窗口配置和 preload 路径
    │   ├── linux-startup.test.ts     # Linux 启动约定
    │   ├── ipc-contract.test.ts      # IPC handler 契约
    │   ├── smoke-script.test.ts      # smoke 脚本和 CI 串联
    │   ├── vitest-config.test.ts     # Vitest 排除本地 worktree/产物目录
    │   └── store.test.ts             # 本地存储文件创建、保存、损坏 JSON 行为
    ├── preload/
    │   └── index.test.ts             # preload 暴露 API 和 IPC 通道契约
    ├── renderer/
    │   ├── helpers/                  # fake API、fixture、matchMedia、样式断言工具
    │   ├── testUtils.ts              # renderer 测试兼容导出入口
    │   ├── App.*.test.tsx            # 按 core/editor/sidebar/toolbar/theme/settings/card/trash 等域拆分
    │   ├── DialogShell.test.tsx      # 弹窗焦点和键盘行为
    │   ├── DropdownMenu.test.tsx     # 通用下拉菜单组件行为
    │   └── noteDeadline.test.ts      # 截止状态纯逻辑契约
    ├── shared/
    │   ├── noteLogic.test.ts         # 共享业务逻辑测试
    │   └── ideaNotesDataValidation.test.ts # 运行时数据结构校验测试
    └── smoke/
        └── build-output.test.ts      # 生产构建产物 smoke
```

## 架构与数据流

1. Renderer 只通过 `window.ideaNotes` 调用桌面能力。
2. `src/preload/index.ts` 把固定函数映射到 IPC 通道，不暴露 `ipcRenderer` 本体。
3. `src/main/ipc/registerIpc.ts` 注册 IPC handler，并用主窗口来源校验保护桌面能力。
4. `src/main/window/createMainWindow.ts` 创建窗口并保持 preload 路径和窗口状态契约。
5. `src/main/store.ts` 负责读取和保存 `IdeaNotesData`，旧数据归一化在 `src/main/store/normalizeData.ts`。
6. `src/shared/noteLogic.ts` 是兼容导出入口，具体规则按 `notes/`、`tags/`、`settings/` 拆分。

## 数据文件与错误处理

- 本地数据文件名是 `idea-notes-data.json`，目录来自 Electron `app.getPath("userData")`。
- 首次启动或数据文件不存在时，主进程会写入 `src/shared/defaultData.ts` 中的默认数据。
- 保存数据使用临时文件 + `rename` 写入，降低中断导致 JSON 损坏的风险。
- 如果已有数据文件是损坏 JSON 或无法按 `IdeaNotesData` 结构校验，应用会抛出错误并显示加载失败状态，不会静默覆盖用户数据。

## CI 与合并门禁

GitHub Actions 位于 `.github/workflows/ci.yml`，在 `pull_request` 和推送到 `main` 时运行：

1. `npm ci`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run format:check`
5. `npm test`
6. `npm run build`
7. `npm run smoke`

当前 `smoke` 是无新增依赖的构建产物检查，验证 `out/main/index.js`、`out/preload/index.mjs`、`out/renderer/index.html` 和关键 IPC/preload 契约。它不启动真实 Electron 窗口，也不生成视觉截图；后续如果引入 Playwright、Xvfb 或其它桌面自动化工具，需要单独更新脚本、CI 和文档。

## 测试策略

| 修改范围                                                | 推荐命令                                                                       | 覆盖重点                                      |
| ------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------- |
| `src/shared/`                                           | `npm test -- tests/shared/noteLogic.test.ts`                                   | 纯业务逻辑、筛选排序、标签、回收站            |
| `src/shared/ideaNotesDataValidation.ts`                 | `npm test -- tests/shared/ideaNotesDataValidation.test.ts`                     | 持久化数据运行时结构校验                      |
| `src/main/store.ts`                                     | `npm test -- tests/main/store.test.ts`                                         | userData 文件、默认数据、保存写入、损坏 JSON  |
| 打包脚本、安装包目标、桌面图标                          | `npm test -- tests/main/packaging-config.test.ts`                              | package 脚本、electron-builder 目标、图标资源 |
| `src/main/window/`                                      | `npm test -- tests/main/window-config.test.ts`                                 | preload 路径、窗口尺寸、桌面图标              |
| `src/main/platform/`                                    | `npm test -- tests/main/linux-startup.test.ts`                                 | Linux 启动参数、桌面标识                      |
| `src/main/ipc/`                                         | `npm test -- tests/main/ipc-contract.test.ts`                                  | IPC 通道、来源校验、payload 校验              |
| `src/preload/index.ts`、`IdeaNotesApi`                  | `npm test -- tests/preload/index.test.ts`                                      | 暴露 API、IPC 通道、禁止任意 ipcRenderer      |
| renderer 组件、样式、i18n                               | `npm test -- tests/renderer`                                                   | React 交互、样式契约、文案同步、卡片流程      |
| TypeScript/TSX/配置脚本                                 | `npm run lint`                                                                 | ESLint 静态检查、React Hooks 基础规则         |
| 源码、测试、配置和版本化文档                            | `npm run format:check`                                                         | Prettier 格式一致性                           |
| `package.json`、`.github/workflows`、`vitest.config.ts` | `npm test -- tests/main/smoke-script.test.ts tests/main/vitest-config.test.ts` | CI/smoke 脚本和测试扫描边界                   |
| 生产构建产物                                            | `npm run build && npm run smoke`                                               | main/preload/renderer 关键产物                |
| 全仓交付前                                              | `npm test`                                                                     | 全量回归                                      |
| 构建/入口/打包相关                                      | `npm run build`                                                                | main/preload/renderer 生产构建                |

## 开发规范

- 每次改动只处理一个目标，避免把功能、测试、文档和格式整理混在一起。
- 修改 IPC 契约时同步更新 `src/shared/types.ts`、`src/preload/index.ts`、`src/main/index.ts` 和相关测试。
- 修改持久化数据结构时同步更新默认数据、类型、迁移策略和测试。
- 新增 UI 文案时同步补齐 `zh-CN`、`zh-TW`、`en` 和 `i18n/types.ts`。
- 样式按职责写入 `src/renderer/src/styles/` 对应文件，不把模块样式直接塞进 `styles.css`。
- 不直接编辑 `out/`、`release/`、`node_modules/`、`docs/` 或 `.omo/` 中的产物/本地资料。

## 协作流程

1. 拉取最新代码后运行 `npm install`。
2. 从最新 `main` 创建非 `main` 工作分支；禁止直接在 `main` 分支提交或推送文件变更。
3. 阅读本 README、`AGENTS.md` 和相关测试文件。
4. 根据修改范围选择聚焦测试，先确认当前基线。
5. 做最小改动，并同步补充或更新测试。
6. 运行聚焦测试、`npm test`，必要时运行 `npm run build` 和 `npm run smoke`。
7. 合并前运行 `npm run ci`。
8. 提交前检查 `git status --short`、`git diff` 和当前分支，只提交本任务相关文件。
9. 将工作分支推送到远端，并通过 PR 合并到 `main`。

## 本地运行提示

- `npm run dev` 已设置 `NO_SANDBOX=1`，用于规避部分 Linux Electron sandbox 权限问题。
- 如果 dev server 已显示 `Local: http://localhost:5174/`，但 Electron 随后出现 GPU/network service 报错，通常是本地 Electron 环境问题；请记录输出，不要把它当成测试通过。
- `npm run build` 只生成 `out/`；打包目录包使用 `npm run package`，输出在 `release/`。
- `npm run smoke` 依赖已存在的 `out/` 构建产物；本地单独运行前请先执行 `npm run build`。`npm run ci` 会自动按正确顺序执行。
- 当前 CI smoke 是无新依赖的构建产物检查，不启动真实 Electron 窗口；若后续引入 Playwright 或 Xvfb，需要单独更新脚本和文档。

## 维护建议

- README 面向人类协作者，写安装、命令、目录、流程和排障。
- AGENTS.md 面向 OpenCode 代理，写执行边界、测试策略、代码约定和安全规则。
- 新增目录、测试文件、IPC 能力或构建脚本后，同时检查 README 和 AGENTS.md 是否需要更新。
