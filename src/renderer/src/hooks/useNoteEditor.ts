// 笔记编辑器状态 hook。
// 作用：
// 1. 管理编辑器打开状态、草稿和标签切换。
// 2. 封装新建、编辑和保存笔记流程。
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { saveNote } from "@shared/noteLogic";
import type { IdeaNote, IdeaNotesData, NoteDraft, NoteStatus } from "@shared/types";
import type { AppCopy } from "../i18n";
import {
  buildDraftFromNote,
  draftToUpdatedNote,
  initialDraft,
} from "../utils/noteDraft";
import type { SaveErrorTarget } from "./useIdeaNotesData";

type PersistData = (
  nextData: IdeaNotesData,
  errorTarget?: SaveErrorTarget,
) => Promise<boolean>;

interface UseNoteEditorInput {
  data: IdeaNotesData | null;
  notes: IdeaNote[];
  copy: AppCopy;
  persist: PersistData;
  blockIfSaving: (errorTarget: SaveErrorTarget) => boolean;
  setSaveFeedback: (feedback: null) => void;
  setViewMode: (viewMode: NoteStatus) => void;
}

export interface UseNoteEditorResult {
  draft: NoteDraft;
  setDraft: Dispatch<SetStateAction<NoteDraft>>;
  isEditorOpen: boolean;
  setIsEditorOpen: Dispatch<SetStateAction<boolean>>;
  editingNote: IdeaNote | undefined;
  openNewNote: () => void;
  openExistingNote: (note: IdeaNote) => void;
  handleSaveNote: () => Promise<void>;
  toggleDraftTag: (tag: string) => void;
}

export function useNoteEditor({
  data,
  notes,
  copy,
  persist,
  blockIfSaving,
  setSaveFeedback,
  setViewMode,
}: UseNoteEditorInput): UseNoteEditorResult {
  const [draft, setDraft] = useState<NoteDraft>(initialDraft);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  function openNewNote(): void {
    if (blockIfSaving(isEditorOpen ? "editor" : "main")) return;
    setSaveFeedback(null);
    setDraft(initialDraft);
    setIsEditorOpen(true);
  }

  function openExistingNote(note: IdeaNote): void {
    if (blockIfSaving(isEditorOpen ? "editor" : "main")) return;
    setSaveFeedback(null);
    setDraft(buildDraftFromNote(note));
    setIsEditorOpen(true);
  }

  async function handleSaveNote(): Promise<void> {
    if (!data) return;
    const normalizedDraft: NoteDraft = {
      ...draft,
      title: draft.title.trim() || copy.unnamedNote,
    };
    // draft.id 存在表示编辑已有笔记；不存在则走新建流程并插入列表顶部。
    const nextData = draft.id
      ? {
          ...data,
          notes: data.notes.map((note) =>
            note.id === draft.id
              ? draftToUpdatedNote(note, normalizedDraft, copy.unnamedNote)
              : note,
          ),
        }
      : saveNote(data, normalizedDraft);
    const didSave = await persist(nextData, "editor");
    if (!didSave) return;
    setIsEditorOpen(false);
    setDraft(initialDraft);
    setViewMode("active");
  }

  function toggleDraftTag(tag: string): void {
    setDraft((currentDraft) => ({
      ...currentDraft,
      tags: currentDraft.tags.includes(tag)
        ? currentDraft.tags.filter((item) => item !== tag)
        : [...currentDraft.tags, tag],
    }));
  }

  return {
    draft,
    setDraft,
    isEditorOpen,
    setIsEditorOpen,
    editingNote: notes.find((note) => note.id === draft.id),
    openNewNote,
    openExistingNote,
    handleSaveNote,
    toggleDraftTag,
  };
}
