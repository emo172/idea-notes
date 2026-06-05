// 编辑器底部动作区组件。
// 作用：
// 1. 渲染取消和保存按钮。
// 2. 统一保存进行中禁用状态和按钮图标。
import type { ReactElement } from "react";
import { FloppyDiskIcon, XCircleIcon } from "@phosphor-icons/react";
import { AppButton } from "../ui/AppButton";
import type { AppCopy } from "../../i18n";

interface EditorDialogActionsProps {
  copy: AppCopy;
  isSaving: boolean;
  onCancel: () => void;
  onSave: () => Promise<void>;
}

export function EditorDialogActions({
  copy,
  isSaving,
  onCancel,
  onSave,
}: EditorDialogActionsProps): ReactElement {
  return (
    <>
      <AppButton
        className="editor-action-button editor-cancel-action"
        icon={<XCircleIcon className="editor-cancel-icon" weight="bold" />}
        disabled={isSaving}
        aria-busy={isSaving}
        onClick={onCancel}
      >
        {copy.cancel}
      </AppButton>
      <AppButton
        className="editor-action-button editor-save-action"
        variant="primary"
        icon={<FloppyDiskIcon weight="bold" />}
        disabled={isSaving}
        aria-busy={isSaving}
        onClick={onSave}
      >
        {copy.saveNote}
      </AppButton>
    </>
  );
}
