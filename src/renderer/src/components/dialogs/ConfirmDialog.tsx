// Idea Notes 确认弹层组件。
// 作用：
// 1. 渲染彻底删除笔记前的二次确认对话框。
// 2. 通过回调把取消和确认动作交给 App 处理。
import type { ReactElement } from "react";
import { TrashIcon, XIcon } from "@phosphor-icons/react";
import { AppButton } from "../ui/AppButton";
import type { AppCopy } from "../../i18n";

interface ConfirmDialogProps {
  title?: string;
  body?: string;
  noteTitle?: string;
  copy: AppCopy;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export function ConfirmDialog({
  title,
  body,
  noteTitle,
  copy,
  onCancel,
  onConfirm,
}: ConfirmDialogProps): ReactElement {
  const confirmTitle = title ?? copy.deleteConfirmTitle;
  const confirmBody =
    body ??
    (noteTitle
      ? `${copy.deleteConfirmBody}：${noteTitle}`
      : copy.deleteConfirmBody);

  return (
    <div className="confirm-overlay">
      <section
        className="confirm-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-confirm-title"
      >
        <h2 id="delete-confirm-title">{confirmTitle}</h2>
        <p>{confirmBody}</p>
        <div className="confirm-actions">
          <AppButton icon={<XIcon weight="bold" />} onClick={onCancel}>
            {copy.cancel}
          </AppButton>
          <AppButton
            className="danger"
            icon={<TrashIcon weight="bold" />}
            onClick={onConfirm}
          >
            {copy.confirmDelete}
          </AppButton>
        </div>
      </section>
    </div>
  );
}
