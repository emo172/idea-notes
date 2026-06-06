# 发布说明

本文件记录桌面包构建和发布前检查。当前项目没有自动签名或自动发布流水线，发布包需要在目标平台或对应构建环境中生成。

## 发布前检查

1. 确认工作区没有无关改动：`git status --short`。
2. 安装锁定依赖：`npm ci`。
3. 运行完整验证：`npm run ci`。
4. 如涉及 UI，补充截图或手动桌面验证记录。
5. 确认 `out/` 和 `release/` 不会被提交。

## 构建命令

| 命令                    | 产物                               |
| ----------------------- | ---------------------------------- |
| `npm run package`       | 当前平台目录包，输出到 `release/`  |
| `npm run package:linux` | Linux `AppImage`                   |
| `npm run package:win`   | Windows `nsis` 安装包              |
| `npm run package:mac`   | macOS `dmg`                        |
| `npm run package:all`   | 按当前环境支持情况生成多平台安装包 |

## 平台注意事项

- Linux：本地开发脚本使用 `NO_SANDBOX=1`，但发布包仍需在目标发行版上手动启动验证。
- Windows：`nsis` 产物需要在 Windows 环境验证安装、卸载、桌面快捷方式和开机自启动行为。
- macOS：`dmg` 产物如需分发给非本机用户，通常还需要签名和公证；当前仓库未配置签名证书。

## smoke 边界

`npm run smoke` 检查 `out/` 下的 main、preload、renderer 入口和关键契约。它不能替代真实安装包启动验证，也不能覆盖截图、窗口遮挡、系统托盘或平台权限问题。
