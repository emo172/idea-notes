// Idea Notes 标签设置草稿状态 hook。
// 作用：
// 1. 管理标签重命名和颜色选择的本地草稿。
// 2. 只在保存成功后清理草稿，失败时保留用户输入便于重试。
import { useState } from "react";
import type { IdeaTag } from "@shared/types";

interface UseTagDraftsOptions {
  onRenameTag: (from: string, to: string) => Promise<boolean>;
  onTagColorChange: (tag: string, color: string) => Promise<boolean>;
}

interface UseTagDraftsResult {
  tagDrafts: Map<string, string>;
  tagColorDrafts: Map<string, string>;
  setTagDraft: (tag: string, value: string) => void;
  setTagColorDraft: (tag: string, value: string) => void;
  commitTagRename: (tag: string) => Promise<void>;
  commitTagColor: (tag: IdeaTag, nextColor: string) => Promise<void>;
}

export function useTagDrafts({
  onRenameTag,
  onTagColorChange,
}: UseTagDraftsOptions): UseTagDraftsResult {
  // 重命名时先把每个标签的输入草稿存在本地 Map，失焦提交后再交给 App 写盘。
  const [tagDrafts, setTagDrafts] = useState<Map<string, string>>(() => new Map());
  const [tagColorDrafts, setTagColorDrafts] = useState<Map<string, string>>(
    () => new Map(),
  );

  function clearTagDraft(tag: string): void {
    setTagDrafts((drafts) => {
      // Map 需要复制后再更新，避免 React 因同一引用而跳过渲染。
      const nextDrafts = new Map(drafts);
      nextDrafts.delete(tag);
      return nextDrafts;
    });
  }

  function setTagDraft(tag: string, value: string): void {
    setTagDrafts((drafts) => {
      // 每个标签独立保存草稿，避免编辑一个标签时覆盖其它输入框。
      const nextDrafts = new Map(drafts);
      nextDrafts.set(tag, value);
      return nextDrafts;
    });
  }

  async function commitTagRename(tag: string): Promise<void> {
    const nextTag = (tagDrafts.get(tag) ?? tag).trim();
    // App 层返回成功后才清草稿，保存失败或输入错误时保留用户输入。
    if (nextTag === tag) {
      clearTagDraft(tag);
      return;
    }
    const didSave = await onRenameTag(tag, nextTag);
    if (didSave) clearTagDraft(tag);
  }

  function clearTagColorDraft(tag: string): void {
    setTagColorDrafts((drafts) => {
      const nextDrafts = new Map(drafts);
      nextDrafts.delete(tag);
      return nextDrafts;
    });
  }

  function setTagColorDraft(tag: string, value: string): void {
    setTagColorDrafts((drafts) => {
      const nextDrafts = new Map(drafts);
      nextDrafts.set(tag, value);
      return nextDrafts;
    });
  }

  async function commitTagColor(tag: IdeaTag, nextColor: string): Promise<void> {
    if (nextColor === tag.color) {
      clearTagColorDraft(tag.name);
      return;
    }
    const didSave = await onTagColorChange(tag.name, nextColor);
    if (didSave) clearTagColorDraft(tag.name);
  }

  return {
    tagDrafts,
    tagColorDrafts,
    setTagDraft,
    setTagColorDraft,
    commitTagRename,
    commitTagColor,
  };
}
