// 统一按钮组件。
// 作用：
// 1. 将全应用按钮的尺寸、变体、激活态和图标槽集中到一个入口。
// 2. 保证标题栏、侧栏、卡片、编辑器和设置页复用同一套可访问按钮结构。
// 3. 让样式文件只处理 `.app-button-*` 类名，业务组件无需重复拼装按钮 DOM。
import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";

type AppButtonVariant = "subtle" | "primary" | "icon" | "tab";
type AppButtonSize = "sm" | "md";

interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  icon?: ReactNode;
  size?: AppButtonSize;
  variant?: AppButtonVariant;
}

export function AppButton({
  active = false,
  children,
  className,
  icon,
  size = "md",
  variant = "subtle",
  ...props
}: AppButtonProps): ReactElement {
  // classNames 的顺序与 styles/buttons.css 中的选择器职责对应，方便测试按类名验证统一按钮体系。
  const classNames = [
    "app-button",
    `app-button-variant-${variant}`,
    `app-button-size-${size}`,
    active ? "active" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classNames} type="button" {...props}>
      {icon ? (
        // 图标只做视觉提示，按钮的可访问名称由 aria-label 或 children 提供。
        <span className="app-button-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </button>
  );
}
