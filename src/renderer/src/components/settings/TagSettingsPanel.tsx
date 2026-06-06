// Idea Notes 标签设置组件。
// 作用：
// 1. 渲染主内容区中的全局标签新增、重命名和删除入口。
// 2. 在组件内维护标签重命名和颜色草稿，提交结果通过回调交给 App 持久化。
import { useState } from "react";
import type { ReactElement } from "react";
import { TagIcon, TrashIcon } from "@phosphor-icons/react";
import type { IdeaNotesData, IdeaTag } from "@shared/types";
import { getTagStyle } from "../../utils/tagDisplay";
import { AppButton } from "../ui/AppButton";
import type { AppCopy } from "../../i18n";

interface TagSettingsPanelProps {
  data: IdeaNotesData | null;
  copy: AppCopy;
  tagName: string;
  tagInputError?: string | null;
  tagSaveFeedback?: string | null;
  isSaving?: boolean;
  setTagName: (value: string) => void;
  onAddTag: () => Promise<boolean>;
  onRenameTag: (from: string, to: string) => Promise<boolean>;
  onTagColorChange: (tag: string, color: string) => Promise<boolean>;
  onDeleteTag: (tag: string) => Promise<void>;
}

export function TagSettingsPanel({
  data,
  copy,
  tagName,
  tagInputError,
  tagSaveFeedback,
  isSaving = false,
  setTagName,
  onAddTag,
  onRenameTag,
  onTagColorChange,
  onDeleteTag,
}: TagSettingsPanelProps): ReactElement {
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

  async function commitTagColor(tag: IdeaTag, nextColor: string): Promise<void> {
    if (nextColor === tag.color) {
      clearTagColorDraft(tag.name);
      return;
    }
    const didSave = await onTagColorChange(tag.name, nextColor);
    if (didSave) clearTagColorDraft(tag.name);
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
          disabled={isSaving}
          aria-busy={isSaving}
          value={tagName}
          onChange={(event) => setTagName(event.target.value)}
          onKeyDown={async (event) => {
            if (event.key === "Enter" && !isSaving) {
              event.preventDefault();
              await onAddTag();
            }
          }}
          placeholder={copy.newTagPlaceholder}
        />
        <AppButton
          icon={<TagIcon weight="bold" />}
          disabled={isSaving}
          aria-busy={isSaving}
          onClick={onAddTag}
        >
          {copy.addTag}
        </AppButton>
      </div>
      {tagSaveFeedback ? (
        <div className="app-error-alert tag-save-feedback" role="alert">
          {tagSaveFeedback}
        </div>
      ) : null}
      {tagInputError ? (
        <div className="app-error-alert tag-input-error" role="alert">
          {tagInputError}
        </div>
      ) : null}
      <div className="tag-manager-list">
        {data.tags.map((tag: IdeaTag) => (
          <div className="tag-manager-item" key={tag.id}>
            <span
              className="tag-color-swatch"
              style={getTagStyle(data.tags, tag.name)}
              aria-hidden="true"
            />
            <input
              aria-label={`${copy.tagInputLabel} ${tag.name}`}
              disabled={isSaving}
              value={tagDrafts.get(tag.name) ?? tag.name}
              onChange={(event) =>
                setTagDrafts((drafts) => {
                  // 每个标签独立保存草稿，避免编辑一个标签时覆盖其它输入框。
                  const nextDrafts = new Map(drafts);
                  nextDrafts.set(tag.name, event.target.value);
                  return nextDrafts;
                })
              }
              onBlur={() => commitTagRename(tag.name)}
              aria-busy={isSaving}
            />
            <input
              type="text"
              className="tag-color-input"
              aria-label={`${copy.tagColorLabel} ${tag.name}`}
              disabled={isSaving}
              value={tagColorDrafts.get(tag.name) ?? tag.color}
              onChange={(event) =>
                setTagColorDrafts((drafts) => {
                  const nextDrafts = new Map(drafts);
                  nextDrafts.set(tag.name, event.target.value);
                  return nextDrafts;
                })
              }
              onBlur={(event) => commitTagColor(tag, event.target.value)}
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
        ))}
      </div>
    </section>
  );
}
