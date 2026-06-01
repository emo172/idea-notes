// Idea Notes 通用弹窗外壳组件。
// 作用：
// 1. 统一确认弹窗和编辑器弹窗的遮罩、面板、标题区和动作区结构。
// 2. 保留业务弹窗的内容插槽，让具体弹窗只关心文案、表单和行为。
// 3. 集中维护弹窗可访问属性，避免不同弹窗各自拼装 role 和 aria 约定。
import type { ReactElement, ReactNode } from "react";

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
}: DialogShellProps): ReactElement {
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

  return (
    <div className={overlayClassNames}>
      <section
        className={panelClassNames}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy ?? titleId}
        aria-describedby={describedBy}
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
