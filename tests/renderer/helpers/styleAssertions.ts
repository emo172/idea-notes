// 渲染层样式断言工具。
// 作用：
// 1. 集中读取 renderer 样式源码，服务样式职责和规则测试。
// 2. 提供 CSS 规则提取辅助函数，避免测试文件重复正则逻辑。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const RENDERER_SRC = resolve("src/renderer/src");

export function readRendererStyles(): string {
  const styleFiles = [
    "styles.css",
    "styles/base.css",
    "styles/buttons.css",
    "styles/dropdown.css",
    "styles/layout.css",
    "styles/sidebar.css",
    "styles/toolbar.css",
    "styles/notes-list.css",
    "styles/note-card.css",
    "styles/note-card-meta.css",
    "styles/note-card-content.css",
    "styles/note-card-tags.css",
    "styles/checklist-preview.css",
    "styles/note-actions.css",
    "styles/dialogs.css",
    "styles/editor-layout.css",
    "styles/editor-main.css",
    "styles/markdown-preview.css",
    "styles/editor-side.css",
    "styles/settings-view.css",
    "styles/settings-tabs.css",
    "styles/settings-form.css",
    "styles/tag-manager.css",
  ];

  return styleFiles
    .map((file) => readFileSync(resolve(RENDERER_SRC, file), "utf8"))
    .join("\n");
}

export function readCssRuleBlock(styles: string, selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return styles.match(new RegExp(`${escapedSelector}\\s*\\{[^}]*\\}`))?.[0] ?? "";
}
