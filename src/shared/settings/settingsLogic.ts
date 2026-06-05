// 设置纯逻辑。
// 作用：
// 1. 合并设置变更。
// 2. 避免修改单个偏好时覆盖其它设置字段。
import type { IdeaNotesData, IdeaSettings } from "../types";

export function updateSettings(
  data: IdeaNotesData,
  settings: Partial<IdeaSettings>,
): IdeaNotesData {
  // 设置更新使用浅合并，避免修改单个偏好时覆盖其他设置。
  return { ...data, settings: { ...data.settings, ...settings } };
}
