// 通用下拉菜单组件。
// 作用：
// 1. 为下拉浮层提供统一的 menu 语义和基础类名。
// 2. 让业务组件只声明菜单项，不重复拼装菜单容器。
import { useEffect, useRef } from "react";
import type { KeyboardEvent, MouseEvent, ReactElement, ReactNode } from "react";

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
  const menuRef = useRef<HTMLDivElement>(null);
  const classNames = ["dropdown-menu", className ?? ""].filter(Boolean).join(" ");

  useEffect(() => {
    getMenuItems(menuRef.current).at(0)?.focus();
  }, []);

  function handleClickCapture(event: MouseEvent<HTMLDivElement>): void {
    if ((event.target as HTMLElement).closest('[role="menuitem"]')) onClose?.();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const menuItems = getMenuItems(event.currentTarget);
    if (menuItems.length === 0) return;

    const activeElement =
      document.activeElement instanceof HTMLButtonElement
        ? document.activeElement
        : null;
    const currentIndex = activeElement ? menuItems.indexOf(activeElement) : -1;

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose?.();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      menuItems[(currentIndex + 1) % menuItems.length]?.focus();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      menuItems[currentIndex > 0 ? currentIndex - 1 : menuItems.length - 1]?.focus();
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      menuItems[0]?.focus();
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      menuItems.at(-1)?.focus();
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const targetItem = currentIndex >= 0 ? menuItems[currentIndex] : menuItems[0];
      targetItem?.click();
    }
  }

  return (
    <div
      ref={menuRef}
      className={classNames}
      role="menu"
      aria-label={label}
      onClickCapture={handleClickCapture}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
}

function getMenuItems(container: HTMLElement | null): HTMLButtonElement[] {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]'),
  ).filter((element) => !element.disabled);
}
