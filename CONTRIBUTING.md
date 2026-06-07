# 协作指南

本文件面向人类协作者，说明分支、提交、验证和 PR 要求。代理执行约束见 `AGENTS.md`，项目上手说明见 `README.md`。

## 开始前

1. 拉取最新代码。
2. 使用 `npm ci` 复现锁定依赖；本地迭代也可用 `npm install`。
3. 阅读本次改动涉及的源码和测试，先确认现有行为。
4. 根据修改范围运行聚焦测试，避免在未知失败基线上继续开发。

## 分支与提交

- 禁止直接在 `main` 分支提交或推送文件变更；所有改动必须先提交到非 `main` 分支，再推送远端分支并创建 PR。
- 开始开发前从最新 `main` 创建工作分支，例如 `git switch -c type/topic`；提交前确认当前分支不是 `main`。
- 建议分支名使用 `type/topic`，例如 `refactor/main-ipc`、`test/renderer-split`、`ci/build-smoke`。
- 提交信息使用约定式提交：`type(scope): 中文摘要`。
- 常用类型：`feat`、`fix`、`refactor`、`style`、`test`、`docs`、`build`、`ci`、`chore`。
- 不把功能、重构、测试拆分、文档和格式整理混在一个提交中。
- 不提交 `out/`、`release/`、`node_modules/`、`docs/`、`.omo/`。

## 验证矩阵

| 修改范围                                                                                  | 推荐命令                                                                                                                      |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `src/shared/`                                                                             | `npm test -- tests/shared`                                                                                                    |
| `src/main/store.ts`、`src/main/store/normalizeData.ts`、`src/main/store/writeJsonFile.ts` | `npm test -- tests/main/store.read-write.test.ts tests/main/store.trash-retention.test.ts tests/main/store.migration.test.ts` |
| `src/main/store/backup.ts`                                                                | `npm test -- tests/main/backup.test.ts`                                                                                       |
| `src/main/reminders/`                                                                     | `npm test -- tests/main/reminder-scheduler.test.ts`                                                                           |
| `src/main/window/`                                                                        | `npm test -- tests/main/window-config.test.ts`                                                                                |
| `src/main/ipc/`                                                                           | `npm test -- tests/main/ipc-contract.test.ts`                                                                                 |
| `src/main/platform/`                                                                      | `npm test -- tests/main/linux-startup.test.ts`                                                                                |
| `src/preload/index.ts` 或 `IdeaNotesApi`                                                  | `npm test -- tests/preload`                                                                                                   |
| 下拉菜单组件                                                                              | `npm test -- tests/renderer/DropdownMenu.test.tsx`                                                                            |
| renderer 组件、hook、样式、i18n                                                           | `npm test -- tests/renderer`                                                                                                  |
| 桌面窄窗口、弹层遮挡、真实 UI 视觉风险                                                    | `npm test -- tests/renderer`，并手动检查 720px 宽 Electron 桌面窗口                                                           |
| TypeScript、TSX、配置脚本                                                                 | `npm run lint`                                                                                                                |
| 源码、测试、配置、版本化文档                                                              | `npm run format:check`                                                                                                        |
| CI、脚本、测试扫描边界                                                                    | `npm test -- tests/main/smoke-script.test.ts tests/main/vitest-config.test.ts`                                                |
| 构建产物 smoke                                                                            | `npm run build && npm run smoke`                                                                                              |
| 合并前完整验证                                                                            | `npm run ci`                                                                                                                  |

## 响应式边界

当前响应式目标是 Electron 桌面窗口的 720px 窄宽度，不承诺移动端浏览器布局。

## PR 要求

- PR 必须来自非 `main` 分支；不要用本地 `main` 直接承载待合并改动。
- PR 描述必须说明改动范围、风险和验证命令。
- UI 或样式改动需要提供截图，或明确说明当前只做 CSS 契约测试、没有真实桌面截图。
- 改动 IPC、数据结构、依赖、构建脚本或打包配置时，必须在 PR 中单独说明影响。
- 涉及通知、数据导入导出或回收站恢复语义时，必须说明数据兼容性、失败/取消路径和用户可见影响。
- 测试失败不能用删除断言或弱化测试规避；先复现根因，再修复。

## 当前 smoke 边界

`npm run smoke` 只检查生产构建产物，不启动真实 Electron 窗口。若需要真实桌面启动、截图或视觉遮挡验证，应新增独立 e2e 工具链，并同步更新 `package.json`、CI、README 和本文件。
