// 笔记命令 hook。
// 作用：
// 1. 集中封装卡片状态、清单、复制、回收站和彻底删除命令。
// 2. 让 App 只负责把命令传给组件，不直接组合每个持久化 payload。
import type { Dispatch, SetStateAction } from "react";
import {
  archiveNote,
  duplicateNote,
  moveNoteToTrash,
  permanentlyDeleteAllTrash,
  permanentlyDeleteNote,
  restoreArchivedNote,
  restoreNoteFromTrash,
  toggleChecklistItem,
  toggleNoteCompleted,
} from "@shared/noteLogic";
import type { IdeaNote, IdeaNotesData, NoteStatus } from "@shared/types";
import type { AppCopy } from "../i18n";
import type { SaveErrorTarget } from "./useIdeaNotesData";

type PersistData = (
  nextData: IdeaNotesData,
  errorTarget?: SaveErrorTarget,
) => Promise<boolean>;

interface UseNoteCommandsInput {
  data: IdeaNotesData | null;
  persist: PersistData;
  copy: AppCopy;
  setViewMode: (viewMode: NoteStatus) => void;
  setDeleteTarget: Dispatch<SetStateAction<IdeaNote | null>>;
  setIsClearTrashConfirmOpen: Dispatch<SetStateAction<boolean>>;
}

export function useNoteCommands({
  data,
  persist,
  copy,
  setViewMode,
  setDeleteTarget,
  setIsClearTrashConfirmOpen,
}: UseNoteCommandsInput): {
  updateNote: (note: IdeaNote) => Promise<boolean>;
  handleMoveToTrash: (note: IdeaNote) => Promise<void>;
  handleRestore: (note: IdeaNote) => Promise<void>;
  handleArchiveNote: (note: IdeaNote) => Promise<void>;
  handleRestoreArchivedNote: (note: IdeaNote) => Promise<void>;
  handleDuplicateNote: (note: IdeaNote) => Promise<void>;
  handlePermanentDelete: (noteId: string) => Promise<void>;
  handleClearTrash: () => Promise<void>;
  handleToggleCompleted: (note: IdeaNote) => Promise<void>;
  handleToggleChecklist: (
    note: IdeaNote,
    itemId: string,
    checked: boolean,
  ) => Promise<void>;
} {
  async function updateNote(note: IdeaNote): Promise<boolean> {
    if (!data) return false;
    return persist({
      ...data,
      notes: data.notes.map((item) => (item.id === note.id ? note : item)),
    });
  }

  async function handleMoveToTrash(note: IdeaNote): Promise<void> {
    await updateNote(moveNoteToTrash(note));
  }

  async function handleRestore(note: IdeaNote): Promise<void> {
    await updateNote(restoreNoteFromTrash(note));
  }

  async function handleArchiveNote(note: IdeaNote): Promise<void> {
    await updateNote(archiveNote(note));
  }

  async function handleRestoreArchivedNote(note: IdeaNote): Promise<void> {
    const restoredNote = restoreArchivedNote(note);
    const didSave = await updateNote(restoredNote);
    if (!didSave) return;
    setViewMode(restoredNote.status);
  }

  async function handleDuplicateNote(note: IdeaNote): Promise<void> {
    if (!data) return;
    const copiedNote = duplicateNote(note, {
      titleSuffix: copy.duplicateTitleSuffix,
    });
    const didSave = await persist({
      ...data,
      notes: [copiedNote, ...data.notes],
    });
    if (!didSave) return;
    setViewMode(copiedNote.status);
  }

  async function handlePermanentDelete(noteId: string): Promise<void> {
    if (!data) return;
    const didSave = await persist({
      ...data,
      notes: permanentlyDeleteNote(data.notes, noteId),
    });
    if (!didSave) return;
    setDeleteTarget(null);
  }

  async function handleClearTrash(): Promise<void> {
    if (!data) return;
    const didSave = await persist({
      ...data,
      notes: permanentlyDeleteAllTrash(data.notes),
    });
    if (!didSave) return;
    setIsClearTrashConfirmOpen(false);
  }

  async function handleToggleCompleted(note: IdeaNote): Promise<void> {
    await updateNote(toggleNoteCompleted(note));
  }

  async function handleToggleChecklist(
    note: IdeaNote,
    itemId: string,
    checked: boolean,
  ): Promise<void> {
    await updateNote(toggleChecklistItem(note, itemId, checked));
  }

  return {
    updateNote,
    handleMoveToTrash,
    handleRestore,
    handleArchiveNote,
    handleRestoreArchivedNote,
    handleDuplicateNote,
    handlePermanentDelete,
    handleClearTrash,
    handleToggleCompleted,
    handleToggleChecklist,
  };
}
