// Idea Notes 标签管理列表组件。
// 作用：
// 1. 渲染全局标签列表并把每项委托给 TagManagerItem。
// 2. 连接标签草稿 Map 与单项输入、提交和删除回调。
import type { ReactElement } from "react";
import type { IdeaTag } from "@shared/types";
import type { AppCopy } from "../../i18n";
import { TagManagerItem } from "./TagManagerItem";

interface TagManagerListProps {
  tags: IdeaTag[];
  copy: AppCopy;
  isSaving: boolean;
  tagDrafts: Map<string, string>;
  tagColorDrafts: Map<string, string>;
  onTagDraftChange: (tag: string, value: string) => void;
  onTagColorDraftChange: (tag: string, value: string) => void;
  onCommitTagRename: (tag: string) => Promise<void>;
  onCommitTagColor: (tag: IdeaTag, nextColor: string) => Promise<void>;
  onDeleteTag: (tag: string) => Promise<void>;
}

export function TagManagerList({
  tags,
  copy,
  isSaving,
  tagDrafts,
  tagColorDrafts,
  onTagDraftChange,
  onTagColorDraftChange,
  onCommitTagRename,
  onCommitTagColor,
  onDeleteTag,
}: TagManagerListProps): ReactElement {
  return (
    <div className="tag-manager-list">
      {tags.map((tag: IdeaTag) => (
        <TagManagerItem
          tag={tag}
          tags={tags}
          copy={copy}
          isSaving={isSaving}
          tagDraft={tagDrafts.get(tag.name)}
          tagColorDraft={tagColorDrafts.get(tag.name)}
          key={tag.id}
          onTagDraftChange={onTagDraftChange}
          onTagColorDraftChange={onTagColorDraftChange}
          onCommitTagRename={onCommitTagRename}
          onCommitTagColor={onCommitTagColor}
          onDeleteTag={onDeleteTag}
        />
      ))}
    </div>
  );
}
