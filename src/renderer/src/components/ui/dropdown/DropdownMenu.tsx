// 通用下拉菜单组件。
// 作用：
// 1. 为下拉浮层提供统一的 menu 语义和基础类名。
// 2. 让业务组件只声明菜单项，不重复拼装菜单容器。
import type { MouseEvent, ReactElement, ReactNode } from "react";

interface DropdownMenuProps {
  children: ReactNode;
  className?: string;
  label: string;
  onClose?: () => void;
}

export function DropdownMenu({
  children,
  className,
  label,
  onClose,
}: DropdownMenuProps): ReactElement {
  const classNames = ["dropdown-menu", className ?? ""]
    .filter(Boolean)
    .join(" ");

  function handleClickCapture(event: MouseEvent<HTMLDivElement>): void {
    if ((event.target as HTMLElement).closest('[role="menuitem"]')) onClose?.();
  }

  return (
    <div
      className={classNames}
      role="menu"
      aria-label={label}
      onClickCapture={handleClickCapture}
    >
      {children}
    </div>
  );
}
