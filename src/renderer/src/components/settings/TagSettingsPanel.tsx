// Idea Notes 标签设置组件。
// 作用：
// 1. 渲染主内容区中的全局标签新增、重命名和删除入口。
// 2. 在组件内维护标签重命名草稿，提交结果通过回调交给 App 持久化。
import { useState } from "react";
import type { ReactElement } from "react";
import { TagIcon, TrashIcon } from "@phosphor-icons/react";
import type { IdeaNotesData } from "@shared/types";
import { AppButton } from "../ui/AppButton";
import type { AppCopy } from "../../i18n";

interface TagSettingsPanelProps {
  data: IdeaNotesData | null;
  copy: AppCopy;
  tagName: string;
  setTagName: (value: string) => void;
  onAddTag: () => Promise<void>;
  onRenameTag: (from: string, to: string) => Promise<void>;
  onDeleteTag: (tag: string) => Promise<void>;
}

export function TagSettingsPanel({
  data,
  copy,
  tagName,
  setTagName,
  onAddTag,
  onRenameTag,
  onDeleteTag,
}: TagSettingsPanelProps): ReactElement {
  // 重命名时先把每个标签的输入草稿存在本地 Map，失焦提交后再交给 App 写盘。
  const [tagDrafts, setTagDrafts] = useState<Map<string, string>>(
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

  async function commitTagRename(tag: string): Promise<void> {
    const nextTag = (tagDrafts.get(tag) ?? tag).trim();
    // 空值或未修改时只清掉草稿；重复名称由 App 层按全局标签库拒绝。
    if (!nextTag || nextTag === tag) {
      clearTagDraft(tag);
      return;
    }
    await onRenameTag(tag, nextTag);
    clearTagDraft(tag);
  }

  if (!data) return <div className="empty-state">{copy.loadingTags}</div>;

  return (
    <section
      className="notes-tag-settings scrollable-panel"
      aria-label={copy.tagSettings}
    >
      <div className="notes-tag-settings-head">
        <div>
          <h2>{copy.tagSettings}</h2>
          <p>{copy.tagSettingsDescription}</p>
        </div>
      </div>
      <div className="tag-add-row">
        <input
          autoFocus
          value={tagName}
          onChange={(event) => setTagName(event.target.value)}
          onKeyDown={async (event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              await onAddTag();
            }
          }}
          placeholder={copy.newTagPlaceholder}
        />
        <AppButton icon={<TagIcon weight="bold" />} onClick={onAddTag}>
          {copy.addTag}
        </AppButton>
      </div>
      <div className="tag-manager-list">
        {data.tags.map((tag) => (
          <div className="tag-manager-item" key={tag}>
            <input
              aria-label={`${copy.tagInputLabel} ${tag}`}
              value={tagDrafts.get(tag) ?? tag}
              onChange={(event) =>
                setTagDrafts((drafts) => {
                  // 每个标签独立保存草稿，避免编辑一个标签时覆盖其它输入框。
                  const nextDrafts = new Map(drafts);
                  nextDrafts.set(tag, event.target.value);
                  return nextDrafts;
                })
              }
              onBlur={() => commitTagRename(tag)}
            />
            <AppButton
              className="danger"
              aria-label={`${copy.deleteTagLabel} ${tag}`}
              icon={<TrashIcon weight="bold" />}
              onClick={() => onDeleteTag(tag)}
            >
              {copy.delete}
            </AppButton>
          </div>
        ))}
      </div>
    </section>
  );
}
