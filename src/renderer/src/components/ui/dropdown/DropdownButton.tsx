// 通用下拉按钮组件。
// 作用：
// 1. 组合统一按钮和下拉菜单，集中承载触发按钮结构。
// 2. 为后续菜单开关、外部点击和键盘关闭行为提供独立边界。
import { cloneElement, useEffect, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { AppButton } from "../AppButton";

interface DropdownButtonProps {
  buttonClassName?: string;
  children: ReactElement<{ onClose?: () => void }>;
  icon: ReactNode;
  label: string;
}

export function DropdownButton({
  buttonClassName,
  children,
  icon,
  label,
}: DropdownButtonProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handlePointerDown(event: PointerEvent): void {
      if (!anchorRef.current?.contains(event.target as Node)) setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const menu = isOpen
    ? cloneElement(children, { onClose: () => setIsOpen(false) })
    : null;

  return (
    <div className="dropdown-anchor" ref={anchorRef}>
      <AppButton
        className={buttonClassName}
        variant="icon"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={label}
        title={label}
        icon={icon}
        onClick={() => setIsOpen((open) => !open)}
      />
      {menu}
    </div>
  );
}
