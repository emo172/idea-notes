// Idea Notes 数据加载与保存 hook。
// 作用：
// 1. 集中管理从 preload API 读取数据、保存数据和重试加载。
// 2. 统一保存 pending 门闩和保存失败反馈，避免各组件直接接触持久化 API。
// 3. 向 App 暴露最小数据状态和保存工具函数，保持业务动作仍由 App 编排。
import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { IdeaNotesData } from "@shared/types";

export type SaveErrorTarget = "main" | "editor";
export type SaveFeedbackKind = "failed" | "busy";

export interface SaveFeedback {
  target: SaveErrorTarget;
  kind: SaveFeedbackKind;
}

interface UseIdeaNotesDataResult {
  data: IdeaNotesData | null;
  setData: Dispatch<SetStateAction<IdeaNotesData | null>>;
  isLoading: boolean;
  hasLoadError: boolean;
  isSaving: boolean;
  saveFeedback: SaveFeedback | null;
  setSaveFeedback: Dispatch<SetStateAction<SaveFeedback | null>>;
  loadData: (shouldCommit?: () => boolean) => Promise<void>;
  persist: (nextData: IdeaNotesData, errorTarget?: SaveErrorTarget) => Promise<boolean>;
  runSavingTask: (
    errorTarget: SaveErrorTarget,
    task: () => Promise<void>,
  ) => Promise<boolean>;
  blockIfSaving: (errorTarget: SaveErrorTarget) => boolean;
}

export function useIdeaNotesData(): UseIdeaNotesDataResult {
  const [data, setData] = useState<IdeaNotesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedback | null>(null);

  const loadData = useCallback(async (shouldCommit: () => boolean = () => true) => {
    setIsLoading(true);
    setHasLoadError(false);
    try {
      const loadedData = await window.ideaNotes.getData();
      if (!shouldCommit()) return;
      setData(loadedData);
    } catch {
      if (!shouldCommit()) return;
      setData(null);
      setHasLoadError(true);
    } finally {
      if (shouldCommit()) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void loadData(() => mounted);
    return () => {
      mounted = false;
    };
  }, [loadData]);

  const runSavingTask = useCallback(
    async (
      errorTarget: SaveErrorTarget,
      task: () => Promise<void>,
    ): Promise<boolean> => {
      if (isSavingRef.current) {
        setSaveFeedback({ target: errorTarget, kind: "busy" });
        return false;
      }
      isSavingRef.current = true;
      setIsSaving(true);
      setSaveFeedback(null);
      try {
        await task();
        setSaveFeedback((currentFeedback) =>
          currentFeedback?.kind === "busy" ? null : currentFeedback,
        );
        return true;
      } catch {
        setSaveFeedback({ target: errorTarget, kind: "failed" });
        return false;
      } finally {
        isSavingRef.current = false;
        setIsSaving(false);
      }
    },
    [],
  );

  const persist = useCallback(
    async (
      nextData: IdeaNotesData,
      errorTarget: SaveErrorTarget = "main",
    ): Promise<boolean> =>
      runSavingTask(errorTarget, async () => {
        const saved = await window.ideaNotes.saveData(nextData);
        setData(saved);
      }),
    [runSavingTask],
  );

  const blockIfSaving = useCallback((errorTarget: SaveErrorTarget): boolean => {
    if (!isSavingRef.current) return false;
    setSaveFeedback({ target: errorTarget, kind: "busy" });
    return true;
  }, []);

  return {
    data,
    setData,
    isLoading,
    hasLoadError,
    isSaving,
    saveFeedback,
    setSaveFeedback,
    loadData,
    persist,
    runSavingTask,
    blockIfSaving,
  };
}
