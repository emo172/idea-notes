// Idea Notes 确认弹层组件。
// 作用：
// 1. 渲染彻底删除笔记前的二次确认对话框。
// 2. 通过回调把取消和确认动作交给 App 处理。
import type { ReactElement } from "react";
import { TrashIcon, XIcon } from "@phosphor-icons/react";
import { DialogShell } from "./DialogShell";
import { AppButton } from "../ui/AppButton";
import type { AppCopy } from "../../i18n";

interface ConfirmDialogProps {
  title?: string;
  body?: string;
  noteTitle?: string;
  copy: AppCopy;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  panelClassName?: string;
  confirmLabel?: string;
}

export function ConfirmDialog({
  title,
  body,
  noteTitle,
  copy,
  onCancel,
  onConfirm,
  panelClassName,
  confirmLabel,
}: ConfirmDialogProps): ReactElement {
  const confirmTitle = title ?? copy.deleteConfirmTitle;
  const confirmBody =
    body ?? (noteTitle ? `${copy.deleteConfirmBody}：${noteTitle}` : undefined);
  const panelClassNames = panelClassName
    ? `confirm-panel ${panelClassName}`
    : "confirm-panel";
  const actions = (
    <>
      <AppButton icon={<XIcon weight="bold" />} onClick={onCancel}>
        {copy.cancel}
      </AppButton>
      <AppButton
        className="danger"
        icon={<TrashIcon weight="bold" />}
        onClick={onConfirm}
      >
        {confirmLabel ?? copy.confirmDelete}
      </AppButton>
    </>
  );

  return (
    <DialogShell
      title={confirmTitle}
      titleId="confirm-dialog-title"
      describedBy={confirmBody ? "confirm-dialog-body" : undefined}
      overlayClassName="confirm-overlay"
      panelClassName={panelClassNames}
      bodyClassName="confirm-body"
      actionsClassName="confirm-actions"
      actions={actions}
    >
      {confirmBody ? <p id="confirm-dialog-body">{confirmBody}</p> : null}
    </DialogShell>
  );
}
