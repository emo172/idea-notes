// 保存反馈提示组件。
// 作用：
// 1. 统一渲染主界面、编辑器和弹窗中的保存失败/忙碌提示。
// 2. 保持 `.app-error-alert` 相关 className 和 `role="alert"` 契约稳定。
import type { ReactElement } from "react";

interface SaveFeedbackAlertProps {
  message?: string | null;
  className?: string;
}

export function SaveFeedbackAlert({
  message,
  className = "",
}: SaveFeedbackAlertProps): ReactElement | null {
  if (!message) return null;
  const alertClassName = className ? `app-error-alert ${className}` : "app-error-alert";

  return (
    <div className={alertClassName} role="alert">
      {message}
    </div>
  );
}
