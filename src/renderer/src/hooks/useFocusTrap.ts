// 弹窗焦点陷阱 hook。
// 作用：
// 1. 管理弹窗打开后的初始焦点和关闭后的焦点恢复。
// 2. 统一处理 Escape、Tab 和 Shift+Tab，避免每个弹窗外壳重复维护焦点循环。
import { useEffect, useRef } from "react";
import type { KeyboardEvent, RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not(:disabled)",
  "input:not(:disabled)",
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function useFocusTrap(onEscape?: () => void): {
  panelRef: RefObject<HTMLElement | null>;
  handleKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
} {
  const panelRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const panel = panelRef.current;
    const firstFocusableElement = panel ? getFocusableElements(panel).at(0) : undefined;
    (firstFocusableElement ?? panel)?.focus();

    return () => {
      const previousFocus = previousFocusRef.current;
      if (previousFocus && canRestoreFocus(previousFocus)) {
        previousFocus.focus();
      }
    };
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>): void {
    if (event.key === "Escape" && onEscape) {
      event.preventDefault();
      event.stopPropagation();
      onEscape();
      return;
    }

    if (event.key !== "Tab") return;

    const panel = panelRef.current;
    if (!panel) return;

    const focusableElements = getFocusableElements(panel);
    if (focusableElements.length === 0) {
      event.preventDefault();
      panel.focus();
      return;
    }

    const firstFocusableElement = focusableElements[0];
    const lastFocusableElement = focusableElements.at(-1);
    if (!firstFocusableElement || !lastFocusableElement) return;

    if (event.shiftKey && document.activeElement === firstFocusableElement) {
      event.preventDefault();
      lastFocusableElement.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === lastFocusableElement) {
      event.preventDefault();
      firstFocusableElement.focus();
    }
  }

  return { panelRef, handleKeyDown };
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((element) => element.tabIndex >= 0)
    .sort((left, right) =>
      left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_PRECEDING ? 1 : -1,
    );
}

function canRestoreFocus(element: HTMLElement): boolean {
  return document.contains(element) && element.tabIndex >= 0;
}
