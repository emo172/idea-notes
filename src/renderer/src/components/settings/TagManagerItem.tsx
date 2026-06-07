// Idea Notes 标签管理列表项组件。
// 作用：
// 1. 渲染单个标签的名称草稿、颜色草稿和删除按钮。
// 2. 把输入事件转换成列表层提供的草稿与提交回调。
import type { ReactElement } from "react";
import { TrashIcon } from "@phosphor-icons/react";
import type { IdeaTag } from "@shared/types";
import type { AppCopy } from "../../i18n";
import { getTagStyle } from "../../utils/tagDisplay";
import { AppButton } from "../ui/AppButton";

interface TagManagerItemProps {
  tag: IdeaTag;
  tags: IdeaTag[];
  copy: AppCopy;
  isSaving: boolean;
  tagDraft?: string;
  tagColorDraft?: string;
  onTagDraftChange: (tag: string, value: string) => void;
  onTagColorDraftChange: (tag: string, value: string) => void;
  onCommitTagRename: (tag: string) => Promise<void>;
  onCommitTagColor: (tag: IdeaTag, nextColor: string) => Promise<void>;
  onDeleteTag: (tag: string) => Promise<void>;
}

export function TagManagerItem({
  tag,
  tags,
  copy,
  isSaving,
  tagDraft,
  tagColorDraft,
  onTagDraftChange,
  onTagColorDraftChange,
  onCommitTagRename,
  onCommitTagColor,
  onDeleteTag,
}: TagManagerItemProps): ReactElement {
  return (
    <div className="tag-manager-item">
      <span
        className="tag-color-swatch"
        style={getTagStyle(tags, tag.name)}
        aria-hidden="true"
      />
      <input
        aria-label={`${copy.tagInputLabel} ${tag.name}`}
        disabled={isSaving}
        value={tagDraft ?? tag.name}
        onChange={(event) => onTagDraftChange(tag.name, event.target.value)}
        onBlur={() => onCommitTagRename(tag.name)}
        aria-busy={isSaving}
      />
      <input
        type="color"
        className="tag-color-input"
        aria-label={`${copy.tagColorLabel} ${tag.name}`}
        disabled={isSaving}
        value={tagColorDraft ?? tag.color}
        onChange={(event) => onTagColorDraftChange(tag.name, event.target.value)}
        onBlur={(event) => onCommitTagColor(tag, event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !isSaving) {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
      />
      <AppButton
        className="danger"
        aria-label={`${copy.deleteTagLabel} ${tag.name}`}
        icon={<TrashIcon weight="bold" />}
        disabled={isSaving}
        aria-busy={isSaving}
        onClick={() => onDeleteTag(tag.name)}
      >
        {copy.delete}
      </AppButton>
    </div>
  );
}
