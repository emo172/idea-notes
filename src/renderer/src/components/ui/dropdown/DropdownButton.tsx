// 通用下拉按钮组件。
// 作用：
// 1. 组合统一按钮和下拉菜单，集中承载触发按钮结构。
// 2. 通过 Portal 将菜单渲染到 document.body，使用 position:fixed 定位脱离 overflow 容器裁剪。
// 3. 为菜单开关、外部点击和键盘关闭行为提供独立边界。
import { cloneElement, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, ReactElement, ReactNode } from "react";
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
  const portalRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  const closeMenu = useCallback((): void => {
    setIsOpen(false);
    anchorRef.current?.querySelector("button")?.focus();
  }, []);

  // 计算菜单 fixed 定位坐标。
  // 菜单相对于锚点元素右下角定位，向下偏移 6px。
  function updateMenuPosition(): void {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    setMenuStyle({
      position: "fixed",
      top: rect.bottom + 6,
      right: window.innerWidth - rect.right,
      zIndex: 131,
    });
  }

  useEffect(() => {
    if (!isOpen) return undefined;

    // 初始化位置并在滚动/缩放时重新计算
    updateMenuPosition();
    window.addEventListener("scroll", updateMenuPosition, true);
    window.addEventListener("resize", updateMenuPosition);

    function handlePointerDown(event: PointerEvent): void {
      const target = event.target as Node;
      const insideAnchor = anchorRef.current?.contains(target);
      const insidePortal = portalRef.current?.contains(target);
      if (!insideAnchor && !insidePortal) closeMenu();
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") closeMenu();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("scroll", updateMenuPosition, true);
      window.removeEventListener("resize", updateMenuPosition);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeMenu]);

  const menuElement = isOpen ? cloneElement(children, { onClose: closeMenu }) : null;

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
      {menuElement
        ? createPortal(
            <div ref={portalRef} style={menuStyle}>
              {menuElement}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
