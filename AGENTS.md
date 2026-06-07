# OpenCode 项目规则

## 官方行为与本地约定

- 官方行为：OpenCode 会读取项目中的 `AGENTS.md`，并把其中的规则纳入当前项目上下文；本文件用于约束代理在本仓库内的工作方式。
- 本地约定：以下规则服务于 `idea-notes/` 仓库的团队协作、代码边界、测试策略和维护流程；它们不替代 `README.md` 的人类上手文档。
- 修改本文件时必须同时考虑 README 是否需要同步更新；面向协作者的操作步骤放 README，面向代理的执行约束放本文件。

## 仓库边界

- 这是 Electron + React + TypeScript 桌面应用，仓库根目录是 `idea-notes/`；父目录中的原型文件不属于本包源码。
- `package.json`、`electron.vite.config.ts`、`vitest.config.ts`、`tsconfig.json`、`electron-builder.yml` 是命令、构建和测试的可执行事实源。
- `docs/` 和 `.omo/` 在 `.gitignore` 中，是本地规划/会话资料；不要把它们当成发布文档或提交目标。
- 构建产物在 `out/`，目录包和安装包在 `release/`；不要手动编辑这些产物。

## 常用命令

- 安装依赖：`npm install`。
- CI 依赖安装：`npm ci`。
- 开发启动：`npm run dev`。
- 类型检查：`npm run typecheck`。
- 静态检查：`npm run lint`。
- 格式检查：`npm run format:check`。
- 自动格式化：`npm run format`。
- 全量测试：`npm test`。
- 聚焦测试：
  - 共享逻辑：`npm test -- tests/shared`。
  - 主进程：`npm test -- tests/main`。
  - preload：`npm test -- tests/preload`。
  - 渲染层：`npm test -- tests/renderer`。
  - 主窗口配置：`npm test -- tests/main/window-config.test.ts`。
  - 主进程 IPC：`npm test -- tests/main/ipc-contract.test.ts`。
  - Linux 启动约定：`npm test -- tests/main/linux-startup.test.ts`。
  - smoke 脚本和测试扫描边界：`npm test -- tests/main/smoke-script.test.ts tests/main/vitest-config.test.ts`。
- 生产构建：`npm run build`，产物在 `out/`。
- 构建产物冒烟检查：`npm run smoke`，需先有 `out/`。
- 合并前完整验证：`npm run ci`。
- 目录打包：`npm run package`，会先 build，再用 `electron-builder --dir` 输出到 `release/`，不生成安装包。

## 架构地图

- `src/main/` 是 Electron 主进程；`index.ts` 只做启动编排；`window/createMainWindow.ts` 创建无边框窗口；`ipc/registerIpc.ts` 注册 IPC；`platform/linuxStartup.ts` 处理本地开发 GPU/sandbox 开关；`startup/loginItems.ts` 封装开机自启动；`store.ts` 把 JSON 数据写入 Electron `userData`。
- `src/main/store/backup.ts` 负责数据导出、覆盖导入和合并导入；`src/main/store/normalizeData.ts` 负责旧数据迁移和归一化；`src/main/store/writeJsonFile.ts` 负责临时文件 + rename 安全写入。
- `src/main/reminders/reminderScheduler.ts` 负责截止提醒通知调度和已提醒 key 写回。
- `src/preload/index.ts` 是 renderer 唯一桌面能力入口，只通过 `window.ideaNotes` 暴露固定 API，不暴露 `ipcRenderer`。
- `src/renderer/src/main.tsx` 只做 React 挂载和全局样式导入；业务状态来源集中在 `src/renderer/src/app/IdeaNotesApp.tsx`。
- `src/renderer/src/app/IdeaNotesApp.tsx` 是 React 主组件；没有 `src/renderer/src/App.tsx`。
- `src/renderer/src/app/AppMainContent.tsx` 组合标签设置、工具栏和笔记列表；`src/renderer/src/app/AppOverlays.tsx` 组合设置页、编辑器和确认弹窗。
- `src/renderer/src/components/` 按职责拆分：`notes/`、`editor/`、`settings/`、`dialogs/`、`titlebar/`、`feedback/`、`overview/`、`ui/`。
- `src/renderer/src/components/overview/StatsPanel.tsx` 负责概览统计面板；`src/renderer/src/components/feedback/SaveFeedbackAlert.tsx` 负责保存反馈提示；`src/renderer/src/components/ui/dropdown/` 放通用下拉菜单按钮和菜单。
- `src/renderer/src/hooks/` 放渲染层状态和命令 hook，包括数据、筛选、窗口控制、笔记命令、标签命令、设置命令、编辑器状态和焦点陷阱。
- `src/renderer/src/utils/` 放渲染层复用工具（如 `noteDraft.ts`、`dateFormatting.ts`、`highlightText.tsx`、`markdownPreview.tsx`、`noteCounts.ts`、`tagDisplay.ts`），不要把 renderer-only 工具放进 `src/shared/`。
- `src/shared/` 只能放 main/preload/renderer/tests 共用的类型和纯业务逻辑；不要引入 Electron 或 React。
- `src/shared/noteLogic.ts` 是兼容聚合导出入口；具体逻辑在 `src/shared/notes/`、`src/shared/tags/`、`src/shared/settings/`。
- `src/shared/ideaNotesDataValidation.ts` 提供主进程保存入口的运行时 payload 校验。
- `src/shared/defaultData.ts` 提供首次启动种子数据和测试默认值。
- `@shared/*` 别名在 `electron.vite.config.ts`、`vitest.config.ts`、`tsconfig.json` 中分别维护；新增共享文件时保持三处可解析。

## 团队协作流程

- 开始开发前先阅读 `README.md`、本文件和相关测试；不要只凭记忆修改代码。
- 先用最小范围理解问题：读相关组件、共享逻辑和测试，再决定改动点。
- 每次任务只做一个目标；功能、修复、测试补充、文档维护和格式整理不要混在一个逻辑改动中。
- 工作区可能已有他人或其它代理的改动；不要回滚、重置或删除自己没改的内容。
- 发现无关问题时记录在最终说明或后续建议，不要顺手修复。
- 新增依赖、改变数据格式、改变 IPC 契约或调整打包配置前，必须说明原因并同步补测试。

## 注释与文档约定

- 新增或大改代码文件时，文件顶部用中文写模块职责：第一行概括模块，随后用「作用：」编号说明为什么存在。
- 公共函数、复杂分支和跨模块边界前用中文注释解释设计意图；不要给简单 JSX、普通赋值或显而易见的样式规则加噪音。
- 配置文件和 CSS 模块也使用中文注释说明职责边界。
- 用户可见文档（`README.md`、`AGENTS.md`、计划、说明）默认中文；命令、路径、API 名称、字段名保留原文。
- README 是团队上手和维护手册；AGENTS.md 是代理执行规则。两者信息冲突时，以可执行配置和代码为准，并同步修正文档。

## IPC 与安全边界

- 新增桌面能力必须同步改四处：`src/shared/types.ts` 的 `IdeaNotesApi`、`src/preload/index.ts`、`src/main/ipc/registerIpc.ts` 的 IPC handler、相关 renderer 调用/测试。
- 主进程 IPC handler 必须继续用 `assertMainWindow()` 校验来源；不要让 renderer 自定义通道名或直接访问 Node/Electron。
- preload 只能暴露固定函数，不暴露 `ipcRenderer` 本体；`tests/preload/index.test.ts` 锁定此约定。
- 窗口配置当前是 `contextIsolation: true`、`nodeIntegration: false`、`sandbox: false`；不要在 renderer 中引入 `node:fs` 或 `electron`。
- preload 构建产物是 `out/preload/index.mjs`。`package.json` 为 ESM，主进程路径必须保持 `../preload/index.mjs`；`tests/main/window-config.test.ts` 锁定此约定。

## 数据与存储约定

- 本地数据文件名是 `idea-notes-data.json`，位置来自 Electron `app.getPath("userData")`。
- `src/main/store.ts` 只在文件不存在时创建默认数据；损坏 JSON 或其它读取错误必须抛出，不能静默覆盖用户数据。
- 写入数据必须继续使用临时文件 + rename 的方式，降低中断导致文件损坏的风险；`tests/main/store.read-write.test.ts` 锁定该行为，`tests/main/store.trash-retention.test.ts` 和 `tests/main/store.migration.test.ts` 锁定读取/保存附带的数据归一化行为。
- 持久化根对象使用 `IdeaNotesData`；变更字段时同步更新默认数据、共享类型、迁移策略（如需要）和测试。

## 渲染层约定

- UI 文案在 `src/renderer/src/i18n/{zh-CN,zh-TW,en}.ts`，字段契约在 `i18n/types.ts`；新增文案必须补齐三种语言。
- 组件按职责放在 `components/` 子目录；桌面能力调用通过 props 回调回到 App 统一处理。
- 图标统一来自 `@phosphor-icons/react`，不要回退到手写 SVG 或字符图标。
- 全局样式入口是 `src/renderer/src/styles.css`，只按顺序 `@import` `styles/` 下职责文件：`base.css`、`buttons.css`、`dropdown.css`、`layout.css`、`sidebar.css`、`toolbar.css`、`notes-list.css`、`note-card.css`、`note-card-meta.css`、`note-card-content.css`、`note-card-tags.css`、`checklist-preview.css`、`note-actions.css`、`dialogs.css`、`editor-layout.css`、`editor-main.css`、`markdown-preview.css`、`editor-side.css`、`settings-view.css`、`settings-tabs.css`、`settings-form.css`、`tag-manager.css`；旧的 `editor.css` 和 `settings.css` 仅保留迁移说明，不作为运行时样式入口。
- `tests/renderer/App.style-boundary.test.tsx`、`tests/renderer/App.responsive-style.test.tsx` 和 `tests/renderer/App.test.tsx` 会检查样式职责边界、响应式契约和测试拆分结构；移动样式或测试时同步维护对应断言。

## 测试策略

- 修改 `src/shared/` 先跑 `npm test -- tests/shared`；这些测试不应依赖 Electron 或 React。
- 修改 `src/main/store.ts`、`src/main/store/normalizeData.ts` 或 `src/main/store/writeJsonFile.ts` 跑 `npm test -- tests/main/store.read-write.test.ts tests/main/store.trash-retention.test.ts tests/main/store.migration.test.ts`。
- 修改 `src/main/store/backup.ts` 跑 `npm test -- tests/main/backup.test.ts`。
- 修改 `src/main/reminders/` 跑 `npm test -- tests/main/reminder-scheduler.test.ts`。
- 修改 shared 提醒逻辑跑 `npm test -- tests/shared tests/main/reminder-scheduler.test.ts`。
- 修改主窗口配置、preload 路径、ESM 设置或 electron-vite 输出路径跑 `npm test -- tests/main/window-config.test.ts`。
- 修改主进程 IPC 注册跑 `npm test -- tests/main/ipc-contract.test.ts`。
- 修改 Linux 启动参数跑 `npm test -- tests/main/linux-startup.test.ts`。
- 修改 `src/preload/index.ts` 或 `IdeaNotesApi` 跑 `npm test -- tests/preload/index.test.ts`。
- 修改 renderer 交互、i18n、样式或组件跑 `npm test -- tests/renderer`。
- 修改下拉菜单组件跑 `npm test -- tests/renderer/DropdownMenu.test.tsx`。
- 修改测试拆分或共享测试工具时跑 `npm test -- tests/renderer`，并确认 `tests/renderer/App.test.tsx` 仍只是结构守护。
- 修改桌面窄窗口布局、弹层遮挡或菜单定位时，除 renderer 测试外还要手动检查 720px 宽 Electron 桌面窗口；当前不按移动端浏览器支持验收。
- 修改 TypeScript、TSX 或配置脚本后跑 `npm run lint`。
- 修改源码、测试、配置或版本化文档后跑 `npm run format:check`；需要统一格式时运行 `npm run format`。
- 完成前至少跑 `npm test`；涉及构建、入口、打包、preload、主进程或样式拆分时再跑 `npm run build`。合并前运行 `npm run ci`。
- 新增测试优先覆盖真实行为和边界，不要只测试 mock；mock 仅用于隔离 Electron API 或外部系统能力。

## 现有测试地图

- `tests/shared/noteLogic.test.ts`：shared 业务逻辑聚合导出入口守护。
- `tests/shared/notes/*.test.ts`：清单、筛选排序、提醒、统计和回收站纯逻辑。
- `tests/shared/tags/tagLogic.test.ts`：标签创建、重命名、删除和颜色纯逻辑。
- `tests/main/packaging-config.test.ts`：跨平台打包脚本、electron-builder 安装包目标和桌面图标配置。
- `tests/main/window-config.test.ts`：主窗口配置、preload 路径和图标约定。
- `tests/main/linux-startup.test.ts`：Linux 启动脚本、GPU 和 sandbox 开关约定。
- `tests/main/ipc-contract.test.ts`：IPC handler 注册、通道和来源校验约定。
- `tests/main/smoke-script.test.ts`：`package.json` smoke 脚本和 CI 串联。
- `tests/main/vitest-config.test.ts`：测试扫描排除本地 worktree、构建产物和本地计划目录。
- `tests/main/store.read-write.test.ts`：本地数据文件创建、保存写入、临时文件清理和损坏 JSON 行为。
- `tests/main/store.trash-retention.test.ts`：读取/保存时回收站过期清理和清理写回失败容错。
- `tests/main/store.migration.test.ts`：旧标签、旧设置、旧回收站 `previousStatus` 迁移和数据校验。
- `tests/main/backup.test.ts`：数据导出、覆盖导入、合并导入和非法 JSON。
- `tests/main/reminder-scheduler.test.ts`：截止提醒通知和已提醒 key 写回。
- `tests/preload/index.test.ts`：preload 暴露 API 与 IPC 通道契约。
- `tests/renderer/testUtils.ts`：渲染层测试兼容导出入口；具体工具在 `tests/renderer/helpers/`。
- `tests/renderer/App.*.test.tsx`：按 core/editor/sidebar/toolbar/theme/tags/settings/cards/trash 等域拆分的 React 交互和样式契约测试。
- `tests/smoke/build-output.test.ts`：生产构建产物 smoke，需先运行 `npm run build`。
- `tests/renderer/DropdownMenu.test.tsx`：通用下拉菜单组件行为。

## 提交规范

- 禁止直接在 `main` 分支提交、暂存并提交文件变更或推送；需要提交时，必须先确认当前分支不是 `main`，把变更提交到非 `main` 分支，再推送远端分支并创建 PR。
- 提交前先检查 `git status --short`、`git diff`、`git diff --staged` 和最近提交风格；提交信息使用约定式提交：`type(scope): 中文摘要`。
- 常用类型限定为 `feat`、`fix`、`refactor`、`style`、`chore`、`test`、`docs`、`build`、`ci`、`perf`、`revert`；摘要保持一句话，不超过 72 个字符。
- 默认拆分为原子提交；不要把功能、修复、重构、格式化、文档或构建配置混在同一次提交中。
- 测试与对应实现拆开会导致中间提交不完整时，测试必须和实现放在同一提交；纯测试补充可单独使用 `test:`。
- 暂存时使用精确文件列表或非交互补丁；不要用交互式暂存，也不要把 `out/`、`release/`、`node_modules/`、`docs/`、`.omo/` 或敏感文件加入提交。
- 未经用户明确要求，不要提交、推送、改写历史或 amend；若用户授权提交，每次提交前后都要核对暂存内容、工作区状态和当前分支，确认不会直接落到 `main`。

## 本地运行坑

- 当前 Linux 环境可能因 Electron `chrome-sandbox` 权限失败；surface smoke 可先用项目脚本 `npm run dev`，脚本已设置 `NO_SANDBOX=1`。
- 即使禁用 sandbox，本环境仍可能因 GPU/network service 报错；若 dev server 已到 `Local: http://localhost:5174/`，记录为环境阻塞，不要把它伪装成测试通过。
- `electron-builder.yml` 只打包 `out/**/*` 和 `package.json`；源码、测试、`docs/` 不会进入应用包。
- `sandbox: false` 是当前 preload 使用 Electron IPC 的已知妥协；`tsconfig.json` 的 `skipLibCheck: true` 和 `noUncheckedSideEffectImports: false` 是现状，不代表新代码可以放松类型和导入纪律。
