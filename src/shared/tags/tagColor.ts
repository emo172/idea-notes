// 标签颜色校验工具。
// 作用：
// 1. 统一标签颜色的 hex 格式判断。
// 2. 为保存校验和旧数据归一化提供同一套规则。
export const tagColorPattern = /^#[0-9a-fA-F]{6}$/;

export function normalizeTagColor(color: string): string | null {
  const trimmed = color.trim();
  return tagColorPattern.test(trimmed) ? trimmed.toLowerCase() : null;
}
