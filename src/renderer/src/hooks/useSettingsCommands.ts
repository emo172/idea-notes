// 设置命令 hook。
// 作用：
// 1. 管理设置保存、开机自启动和重置设置命令。
// 2. 在系统设置成功但本地保存失败时回滚系统状态。
import type { Dispatch, SetStateAction } from "react";
import { defaultSettings } from "@shared/defaultData";
import { updateSettings } from "@shared/noteLogic";
import type { IdeaNotesData } from "@shared/types";

type RunSavingTask = (
  errorTarget: "main",
  task: () => Promise<void>,
) => Promise<boolean>;

interface UseSettingsCommandsInput {
  data: IdeaNotesData | null;
  setData: Dispatch<SetStateAction<IdeaNotesData | null>>;
  runSavingTask: RunSavingTask;
  setIsResetSettingsConfirmOpen: Dispatch<SetStateAction<boolean>>;
  persist: (nextData: IdeaNotesData) => Promise<boolean>;
}

export function useSettingsCommands({
  data,
  setData,
  runSavingTask,
  setIsResetSettingsConfirmOpen,
  persist,
}: UseSettingsCommandsInput): {
  handleSettingsChange: (settings: Partial<IdeaNotesData["settings"]>) => Promise<void>;
  handleConfirmResetSettings: () => Promise<void>;
  handleStartupChange: (enabled: boolean) => Promise<void>;
} {
  async function handleSettingsChange(
    settings: Partial<IdeaNotesData["settings"]>,
  ): Promise<void> {
    if (!data) return;
    const nextData = updateSettings(data, settings);
    await persist(nextData);
  }

  async function handleConfirmResetSettings(): Promise<void> {
    if (!data) return;
    const previousStartup = data.settings.startup;
    const didSave = await runSavingTask("main", async () => {
      const startup = await window.ideaNotes.setStartup(defaultSettings.startup);
      const resetData = updateSettings(data, {
        ...defaultSettings,
        startup,
      });
      try {
        const savedResetData = await window.ideaNotes.saveData(resetData);
        setData(savedResetData);
      } catch (error) {
        await window.ideaNotes.setStartup(previousStartup);
        throw error;
      }
    });
    if (didSave) setIsResetSettingsConfirmOpen(false);
  }

  async function handleStartupChange(enabled: boolean): Promise<void> {
    if (!data) return;
    const previousStartup = data.settings.startup;
    await runSavingTask("main", async () => {
      const startup = await window.ideaNotes.setStartup(enabled);
      try {
        const saved = await window.ideaNotes.saveData(
          updateSettings(data, { startup }),
        );
        setData(saved);
      } catch (error) {
        await window.ideaNotes.setStartup(previousStartup);
        throw error;
      }
    });
  }

  return {
    handleSettingsChange,
    handleConfirmResetSettings,
    handleStartupChange,
  };
}
