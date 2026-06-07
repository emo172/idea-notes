// Idea Notes 标签设置组件。
// 作用：
// 1. 渲染主内容区中的全局标签新增、重命名和删除入口。
// 2. 组合新增表单、标签列表和草稿 hook，提交结果通过回调交给 App 持久化。
import type { ReactElement } from "react";
import type { IdeaNotesData } from "@shared/types";
import type { AppCopy } from "../../i18n";
import { TagAddForm } from "./TagAddForm";
import { TagManagerList } from "./TagManagerList";
import { useTagDrafts } from "./useTagDrafts";

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
  const {
    tagDrafts,
    tagColorDrafts,
    setTagDraft,
    setTagColorDraft,
    commitTagRename,
    commitTagColor,
  } = useTagDrafts({ onRenameTag, onTagColorChange });

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
      <TagAddForm
        copy={copy}
        tagName={tagName}
        isSaving={isSaving}
        setTagName={setTagName}
        onAddTag={onAddTag}
      />
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
      <TagManagerList
        tags={data.tags}
        copy={copy}
        isSaving={isSaving}
        tagDrafts={tagDrafts}
        tagColorDrafts={tagColorDrafts}
        onTagDraftChange={setTagDraft}
        onTagColorDraftChange={setTagColorDraft}
        onCommitTagRename={commitTagRename}
        onCommitTagColor={commitTagColor}
        onDeleteTag={onDeleteTag}
      />
    </section>
  );
}
