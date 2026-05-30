# OpenCode 项目规则

## 仓库边界

- 这是 Electron + React + TypeScript 桌面应用，仓库根目录是 `idea-notes/`；父目录还有原型文件，不属于本包源码。
- `README.md` 目前只有标题；以 `package.json`、`electron.vite.config.ts`、`vitest.config.ts`、`tsconfig.json`、`electron-builder.yml` 作为可执行事实源。
- `docs/` 和 `.omo/` 在 `.gitignore` 中，是本地规划/会话资料；不要把它们当成发布文档或提交目标。

## 常用命令

- 安装依赖：`npm install`。
- 开发启动：`npm run dev`。
- 全量测试：`npm test`。
- 聚焦测试：`npm test -- tests/shared/noteLogic.test.ts`、`npm test -- tests/renderer/App.test.tsx`、`npm test -- tests/main/preload-path.test.ts`。
- 生产构建：`npm run build`，产物在 `out/`。
- 目录打包：`npm run package`，会先 build，再用 `electron-builder --dir` 输出到 `release/`，不生成安装包。

## 架构地图

- `src/main/` 是 Electron 主进程；`index.ts` 创建无边框窗口、注册 IPC、关闭默认菜单，`store.ts` 把 JSON 数据写入 Electron `userData`（临时文件 + rename），`src/shared/defaultData.ts` 提供首次启动种子数据和测试默认值。
- `src/preload/index.ts` 是 renderer 唯一桌面能力入口，只通过 `window.ideaNotes` 暴露固定 API，不暴露 `ipcRenderer`。
- `src/renderer/src/main.tsx` 只做 React 挂载和全局样式导入；业务状态集中在 `src/renderer/src/app/IdeaNotesApp.tsx`。
- `src/renderer/src/app/IdeaNotesApp.tsx` 是 React 主组件；没有 `src/renderer/src/App.tsx`。
- `src/renderer/src/utils/` 放渲染层复用工具（当前是 `noteDraft.ts`、`dateFormatting.ts`），不要把 renderer-only 工具放进 `src/shared/`。
- `src/shared/` 只能放 main/preload/renderer/tests 共用的类型和纯业务逻辑；不要引入 Electron 或 React。
- `@shared/*` 别名在 `electron.vite.config.ts`、`vitest.config.ts`、`tsconfig.json` 中分别维护；新增共享文件时保持三处可解析。

## 注释与文档约定

- 新增或大改代码文件时，文件顶部用中文写模块职责：第一行概括模块，随后用「作用：」编号说明为什么存在。
- 公共函数、复杂分支和跨模块边界前用中文注释解释设计意图；不要给简单 JSX、普通赋值或显而易见的样式规则加噪音。
- 配置文件和 CSS 模块也使用中文注释说明职责边界；用户可见文档（如 `AGENTS.md`、未来 README）默认中文。

## IPC 与安全边界

- 新增桌面能力必须同步改四处：`src/shared/types.ts` 的 `IdeaNotesApi`、`src/preload/index.ts`、`src/main/index.ts` 的 IPC handler、相关 renderer 调用/测试。
- 主进程 IPC handler 必须继续用 `assertMainWindow()` 校验来源；不要让 renderer 自定义通道名或直接访问 Node/Electron。
- 窗口配置当前是 `contextIsolation: true`、`nodeIntegration: false`、`sandbox: false`；不要在 renderer 中引入 `node:fs` 或 `electron`。
- preload 构建产物是 `out/preload/index.mjs`。`package.json` 为 ESM，主进程路径必须保持 `../preload/index.mjs`；`tests/main/preload-path.test.ts` 锁定此约定。

## 渲染层约定

- UI 文案在 `src/renderer/src/i18n/{zh-CN,zh-TW,en}.ts`，字段契约在 `i18n/types.ts`；新增文案必须补齐三种语言。
- 组件按职责放在 `components/` 子目录：`notes/`、`editor/`、`settings/`、`dialogs/`、`titlebar/`、`ui/`；桌面能力调用通过 props 回调回到 App 统一处理。
- 图标统一来自 `@phosphor-icons/react`，不要回退到手写 SVG 或字符图标。
- 全局样式入口是 `src/renderer/src/styles.css`，只按顺序 `@import` `styles/` 下 9 个职责文件：`base.css`、`buttons.css`、`layout.css`、`sidebar.css`、`toolbar.css`、`notes.css`、`dialogs.css`、`editor.css`、`settings.css`。
- `tests/renderer/App.test.tsx` 会聚合拆分后的 CSS 并检查职责边界；移动样式时同步维护对应模块。

## 测试策略

- 修改 `src/shared/` 先跑 `npm test -- tests/shared/noteLogic.test.ts`；这些测试不应依赖 Electron 或 React。
- 修改 renderer 交互、i18n、样式或组件时跑 `npm test -- tests/renderer/App.test.tsx`；该文件用 jsdom 和假的 `window.ideaNotes` 覆盖真实 React 交互。
- 修改主进程 preload 路径、ESM 设置或 electron-vite 输出路径时跑 `npm test -- tests/main/preload-path.test.ts`。
- `tests/renderer/App.test.tsx` 负向锁定了多个文件名约定：不要新增 `src/renderer/src/App.tsx`、`components/icons.tsx`、`i18n/copy.ts` 或 `utils/noteHelpers.ts` 来绕过现有结构。
- 完成前至少跑 `npm test`；涉及构建、打包、入口或样式拆分时再跑 `npm run build`。

## 本地运行坑

- 当前 Linux 环境可能因 Electron `chrome-sandbox` 权限失败；surface smoke 可先用 `ELECTRON_DISABLE_SANDBOX=1`。
- 即使禁用 sandbox，本环境仍可能因 GPU/network service 报 `GPU process isn't usable. Goodbye.`；若 dev server 已到 `Local: http://localhost:5174/`，记录为环境阻塞，不要把它伪装成测试通过。
- `electron-builder.yml` 只打包 `out/**/*` 和 `package.json`；源码、测试、`docs/` 不会进入应用包。
- `sandbox: false` 是当前 preload 使用 Electron IPC 的已知妥协；`tsconfig.json` 的 `skipLibCheck: true` 和 `noUncheckedSideEffectImports: false` 也是现状，不代表新代码可以放松类型和导入纪律。
