# PR 检查清单

## 改动范围

- [ ] 功能或修复：
- [ ] 重构或拆分：
- [ ] 测试：
- [ ] 文档：
- [ ] CI、构建或打包：

## 验证命令

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm run smoke`
- [ ] `npm run ci`

请写明实际运行过的聚焦命令：

```text

```

## UI 与桌面验证

- [ ] 不涉及 UI。
- [ ] 已提供截图或录屏。
- [ ] 只涉及样式契约测试，未启动真实 Electron 窗口；原因：

## 风险说明

- [ ] 不涉及数据迁移。
- [ ] 不涉及 IPC 契约变化。
- [ ] 不涉及新增依赖。
- [ ] 不涉及打包目标变化。

如涉及以上任一项，请在这里说明影响和回滚方式：

```text

```
