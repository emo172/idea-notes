// 标签命令 hook。
// 作用：
// 1. 管理标签输入、输入错误和新增/重命名/删除命令。
// 2. 同步当前筛选标签，避免删除或重命名后保留失效筛选。
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { createNextTag, deleteTag, renameTag, updateTagColor } from "@shared/noteLogic";
import type { IdeaNotesData } from "@shared/types";
import type { SaveErrorTarget } from "./useIdeaNotesData";

export type TagInputError = "required" | "duplicate";

type PersistData = (
  nextData: IdeaNotesData,
  errorTarget?: SaveErrorTarget,
) => Promise<boolean>;

interface UseTagCommandsInput {
  data: IdeaNotesData | null;
  persist: PersistData;
  setSelectedTags: Dispatch<SetStateAction<string[]>>;
  setSaveFeedback: (feedback: null) => void;
}

export function useTagCommands({
  data,
  persist,
  setSelectedTags,
  setSaveFeedback,
}: UseTagCommandsInput): {
  tagName: string;
  tagInputError: TagInputError | null;
  setTagInputError: Dispatch<SetStateAction<TagInputError | null>>;
  setTagName: (value: string) => void;
  handleAddTag: () => Promise<boolean>;
  handleRenameTag: (from: string, to: string) => Promise<boolean>;
  handleTagColorChange: (tag: string, color: string) => Promise<boolean>;
  handleDeleteTag: (tag: string) => Promise<void>;
} {
  const [tagInputError, setTagInputError] = useState<TagInputError | null>(null);
  const [tagName, setRawTagName] = useState("");

  function setTagName(value: string): void {
    setRawTagName(value);
    setTagInputError(null);
  }

  async function handleAddTag(): Promise<boolean> {
    if (!data) return false;
    const nextTag = tagName.trim();
    setSaveFeedback(null);
    if (!nextTag) {
      setTagInputError("required");
      return false;
    }
    if (data.tags.some((tag) => tag.name === nextTag)) {
      setTagInputError("duplicate");
      return false;
    }
    setTagInputError(null);
    const didSave = await persist({
      ...data,
      tags: [...data.tags, createNextTag(nextTag, data.tags)],
    });
    if (!didSave) return false;
    setRawTagName("");
    return true;
  }

  async function handleRenameTag(from: string, to: string): Promise<boolean> {
    if (!data) return false;
    const nextTag = to.trim();
    setSaveFeedback(null);
    if (!nextTag) {
      setTagInputError("required");
      return false;
    }
    if (nextTag === from) {
      setTagInputError(null);
      return true;
    }
    if (data.tags.some((tag) => tag.name === nextTag)) {
      setTagInputError("duplicate");
      return false;
    }
    setTagInputError(null);
    const didSave = await persist(renameTag(data, from, nextTag));
    if (!didSave) return false;
    setSelectedTags((tags) => tags.map((item) => (item === from ? nextTag : item)));
    setTagInputError(null);
    return true;
  }

  async function handleTagColorChange(tag: string, color: string): Promise<boolean> {
    if (!data) return false;
    setSaveFeedback(null);
    setTagInputError(null);
    const currentTag = data.tags.find((item) => item.name === tag);
    if (!currentTag || currentTag.color === color) return true;
    return persist(updateTagColor(data, tag, color));
  }

  async function handleDeleteTag(tag: string): Promise<void> {
    if (!data) return;
    setSaveFeedback(null);
    setTagInputError(null);
    const didSave = await persist(deleteTag(data, tag));
    if (!didSave) return;
    setSelectedTags((tags) => tags.filter((item) => item !== tag));
  }

  return {
    tagName,
    tagInputError,
    setTagInputError,
    setTagName,
    handleAddTag,
    handleRenameTag,
    handleTagColorChange,
    handleDeleteTag,
  };
}
