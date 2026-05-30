// Idea Notes 标题栏图标组件。
// 作用：
// 1. 集中维护标题栏、窗口控制和侧栏切换使用的 Phosphor 图标。
// 2. 保持 App 组件只关注交互和可访问名称。
import type { ReactElement } from "react";
import {
  CornersInIcon,
  CornersOutIcon,
  GearIcon,
  MinusIcon,
  PushPinIcon,
  SidebarIcon,
  XIcon,
} from "@phosphor-icons/react";

export function PinIcon(): ReactElement {
  return (
    <PushPinIcon
      className="titlebar-icon"
      aria-hidden="true"
      focusable="false"
      weight="bold"
    />
  );
}

export function SettingsIcon(): ReactElement {
  return (
    <GearIcon
      className="titlebar-icon"
      aria-hidden="true"
      focusable="false"
      weight="bold"
    />
  );
}

export function MinimizeIcon(): ReactElement {
  return (
    <MinusIcon
      className="titlebar-icon"
      aria-hidden="true"
      focusable="false"
      weight="bold"
    />
  );
}

export function MaximizeIcon(): ReactElement {
  return (
    <CornersOutIcon
      className="titlebar-icon"
      aria-hidden="true"
      focusable="false"
      weight="bold"
    />
  );
}

export function RestoreIcon(): ReactElement {
  return (
    <CornersInIcon
      className="titlebar-icon"
      aria-hidden="true"
      focusable="false"
      weight="bold"
    />
  );
}

export function CloseIcon(): ReactElement {
  return (
    <XIcon
      className="titlebar-icon"
      aria-hidden="true"
      focusable="false"
      weight="bold"
    />
  );
}

export function SidebarToggleIcon(): ReactElement {
  return (
    <SidebarIcon
      className="titlebar-icon"
      aria-hidden="true"
      focusable="false"
      weight="bold"
    />
  );
}
