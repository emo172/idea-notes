// Idea Notes 标签新增表单组件。
// 作用：
// 1. 渲染标签设置页的新标签输入和新增按钮。
// 2. 保持 Enter 提交、保存中禁用和忙碌语义集中在新增表单内。
import type { ReactElement } from "react";
import { TagIcon } from "@phosphor-icons/react";
import type { AppCopy } from "../../i18n";
import { AppButton } from "../ui/AppButton";

interface TagAddFormProps {
  copy: AppCopy;
  tagName: string;
  isSaving: boolean;
  setTagName: (value: string) => void;
  onAddTag: () => Promise<boolean>;
}

export function TagAddForm({
  copy,
  tagName,
  isSaving,
  setTagName,
  onAddTag,
}: TagAddFormProps): ReactElement {
  return (
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
  );
}
