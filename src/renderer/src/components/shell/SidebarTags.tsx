// Idea Notes 应用外壳侧栏标签组件。
// 作用：
// 1. 渲染侧栏标签筛选按钮和标签设置入口。
// 2. 保持标签颜色、选中状态和 aria-pressed 语义集中维护。
import type { ReactElement } from "react";
import { TagIcon } from "@phosphor-icons/react";
import type { IdeaTag } from "@shared/types";
import type { ViewMode } from "../../app/viewMode";
import type { AppCopy } from "../../i18n";
import { getTagStyle } from "../../utils/tagDisplay";
import { AppButton } from "../ui/AppButton";

interface SidebarTagsProps {
  copy: AppCopy;
  viewMode: ViewMode;
  tags: IdeaTag[];
  selectedTags: string[];
  onToggleSelectedTag: (tag: string) => void;
  onOpenTagSettings: () => void;
}

export function SidebarTags({
  copy,
  viewMode,
  tags,
  selectedTags,
  onToggleSelectedTag,
  onOpenTagSettings,
}: SidebarTagsProps): ReactElement {
  return (
    <section className="tags-section">
      <div className="section-title">{copy.tagFilter}</div>
      <div className="tag-stack">
        {tags.map((tag) => (
          <button
            className={
              selectedTags.includes(tag.name) ? "tag-option selected" : "tag-option"
            }
            style={getTagStyle(tags, tag.name)}
            type="button"
            aria-pressed={selectedTags.includes(tag.name)}
            key={tag.id}
            onClick={() => onToggleSelectedTag(tag.name)}
          >
            #{tag.name}
          </button>
        ))}
      </div>
      <AppButton
        className="tag-settings-link"
        active={viewMode === "tag-settings"}
        aria-current={viewMode === "tag-settings" ? "page" : undefined}
        icon={<TagIcon weight="bold" />}
        onClick={onOpenTagSettings}
      >
        {copy.tagSettingsNav}
      </AppButton>
    </section>
  );
}
