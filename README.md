# idea-notes

灵感笔记是一个基于 Electron + React + TypeScript 的桌面应用，用于本地管理笔记、标签、清单、优先级、回收站和应用设置。数据默认保存在本机，适合离线使用。

## 快速开始

```bash
npm install
npm run dev
```

## 常用命令

- `npm run build`：生成生产构建，输出到 `out/`
- `npm run preview`：预览构建结果
- `npm test`：运行 Vitest 测试
- `npm run package`：先构建，再生成 `release/` 目录

## 目录结构

- `src/main/`：Electron 主进程，负责窗口、IPC 和本地存储
- `src/preload/`：渲染层与桌面能力之间的安全桥接
- `src/renderer/src/`：React 渲染层，包含应用状态、组件、样式和文案
- `src/shared/`：主进程、preload、渲染层和测试共用的类型与纯业务逻辑
- `tests/`：共享逻辑、主进程和渲染层测试
- `out/`：构建产物
- `release/`：`npm run package` 生成的目录包

## 开发约定

- 渲染层只通过 preload 暴露的 `window.ideaNotes` 访问桌面能力
- `src/shared/` 只放纯 TypeScript 逻辑，不引入 Electron 或 React
- 新增共享类型时，要同步维护 `electron.vite.config.ts`、`vitest.config.ts` 和 `tsconfig.json` 中的 `@shared/*` 别名
- UI 文案按语言文件维护在 `src/renderer/src/i18n/`

## 运行提示

首次启动时，应用会生成默认示例数据，方便直接查看笔记、标签和清单效果。
