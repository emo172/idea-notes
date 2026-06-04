// Idea Notes 通用弹窗外壳组件。
// 作用：
// 1. 统一确认弹窗和编辑器弹窗的遮罩、面板、标题区和动作区结构。
// 2. 保留业务弹窗的内容插槽，让具体弹窗只关心文案、表单和行为。
// 3. 集中维护弹窗可访问属性，避免不同弹窗各自拼装 role 和 aria 约定。
import { useEffect, useRef } from "react";
import type { KeyboardEvent, ReactElement, ReactNode } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not(:disabled)",
  "input:not(:disabled)",
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

interface DialogShellProps {
  title: ReactNode;
  titleId: string;
  children: ReactNode;
  actions: ReactNode;
  labelledBy?: string;
  describedBy?: string;
  overlayClassName?: string;
  panelClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  actionsClassName?: string;
  onEscape?: () => void;
}

export function DialogShell({
  title,
  titleId,
  children,
  actions,
  labelledBy,
  describedBy,
  overlayClassName,
  panelClassName,
  headerClassName,
  bodyClassName,
  actionsClassName,
  onEscape,
}: DialogShellProps): ReactElement {
  const panelRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const overlayClassNames = ["dialog-overlay", overlayClassName]
    .filter(Boolean)
    .join(" ");
  const panelClassNames = ["dialog-panel", panelClassName]
    .filter(Boolean)
    .join(" ");
  const headerClassNames = ["dialog-head", headerClassName]
    .filter(Boolean)
    .join(" ");
  const bodyClassNames = ["dialog-body", bodyClassName]
    .filter(Boolean)
    .join(" ");
  const actionsClassNames = ["dialog-actions", actionsClassName]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const panel = panelRef.current;
    const firstFocusableElement = panel
      ? getFocusableElements(panel).at(0)
      : undefined;
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

  return (
    <div className={overlayClassNames}>
      <section
        ref={panelRef}
        className={panelClassNames}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy ?? titleId}
        aria-describedby={describedBy}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <header className={headerClassNames}>
          <h2 id={titleId}>{title}</h2>
        </header>
        <div className={bodyClassNames}>{children}</div>
        <footer className={actionsClassNames}>{actions}</footer>
      </section>
    </div>
  );
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((element) => element.tabIndex >= 0)
    .sort((left, right) =>
      left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_PRECEDING
        ? 1
        : -1,
    );
}

function canRestoreFocus(element: HTMLElement): boolean {
  return document.contains(element) && element.tabIndex >= 0;
}
