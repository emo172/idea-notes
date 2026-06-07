// 标签设置视图组件。
// 作用：
// 1. 承载 App 主内容中的 tag-settings 分支。
// 2. 在视图边界内把标签输入错误类型映射为当前语言文案。
import type { ReactElement } from "react";
import type { IdeaNotesData } from "@shared/types";
import { TagSettingsPanel } from "../components/settings/TagSettingsPanel";
import type { TagInputError } from "../hooks/useTagCommands";
import type { AppCopy } from "../i18n";

interface TagSettingsViewProps {
  data: IdeaNotesData | null;
  copy: AppCopy;
  tagName: string;
  tagInputError: TagInputError | null;
  mainSaveFeedback: string | null;
  isSaving: boolean;
  setTagName: (value: string) => void;
  handleAddTag: () => Promise<boolean>;
  handleRenameTag: (from: string, to: string) => Promise<boolean>;
  handleTagColorChange: (tag: string, color: string) => Promise<boolean>;
  handleDeleteTag: (tag: string) => Promise<void>;
}

export function TagSettingsView({
  data,
  copy,
  tagName,
  tagInputError,
  mainSaveFeedback,
  isSaving,
  setTagName,
  handleAddTag,
  handleRenameTag,
  handleTagColorChange,
  handleDeleteTag,
}: TagSettingsViewProps): ReactElement {
  const tagInputErrorMessage =
    tagInputError === "required"
      ? copy.tagNameRequired
      : tagInputError === "duplicate"
        ? copy.tagAlreadyExists
        : null;

  return (
    <TagSettingsPanel
      data={data}
      copy={copy}
      tagName={tagName}
      tagInputError={tagInputErrorMessage}
      tagSaveFeedback={mainSaveFeedback}
      isSaving={isSaving}
      setTagName={setTagName}
      onAddTag={handleAddTag}
      onRenameTag={handleRenameTag}
      onTagColorChange={handleTagColorChange}
      onDeleteTag={handleDeleteTag}
    />
  );
}
