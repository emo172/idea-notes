// 标签展示工具。
// 作用：
// 1. 按笔记标签名查找全局标签颜色。
// 2. 为侧栏、卡片和编辑器提供一致的 CSS 变量值。
import type { CSSProperties } from "react";
import type { IdeaTag } from "@shared/types";

export function getTagStyle(tags: IdeaTag[], name: string): CSSProperties {
  const color = tags.find((tag) => tag.name === name)?.color;
  return color ? ({ "--tag-color": color } as CSSProperties) : {};
}
