// Idea Notes 应用外壳标题栏组件。
// 作用：
// 1. 渲染应用标题、自定义窗口控制和设置入口。
// 2. 让 AppShell 只负责组合布局，不内联窗口按钮 JSX。
import type { ReactElement } from "react";
import type { DesktopWindowState } from "@shared/types";
import type { AppCopy } from "../../i18n";
import {
  CloseIcon,
  MaximizeIcon,
  MinimizeIcon,
  PinIcon,
  RestoreIcon,
  SettingsIcon,
  ShortcutHelpIcon,
} from "../titlebar/TitlebarIcons";
import { AppButton } from "../ui/AppButton";

interface TitlebarProps {
  copy: AppCopy;
  windowState: DesktopWindowState;
  useAppWindowControls: boolean;
  pinButtonLabel: string;
  onToggleAlwaysOnTop: () => Promise<void>;
  onOpenSettings: () => void;
  onOpenShortcutHelp: () => void;
  onMinimizeWindow: () => void;
  onToggleMaximizeWindow: () => Promise<void>;
  onCloseWindow: () => void;
}

export function Titlebar({
  copy,
  windowState,
  useAppWindowControls,
  pinButtonLabel,
  onToggleAlwaysOnTop,
  onOpenSettings,
  onOpenShortcutHelp,
  onMinimizeWindow,
  onToggleMaximizeWindow,
  onCloseWindow,
}: TitlebarProps): ReactElement {
  return (
    <header className="titlebar">
      <div className="titlebar-left">
        <span className="app-logo">I</span>
        <span className="app-title">{copy.appTitle}</span>
      </div>
      <div className="titlebar-actions">
        <AppButton
          className={windowState.isAlwaysOnTop ? "icon-btn active" : "icon-btn"}
          active={windowState.isAlwaysOnTop}
          variant="icon"
          aria-label={pinButtonLabel}
          title={pinButtonLabel}
          icon={<PinIcon pinned={windowState.isAlwaysOnTop} />}
          onClick={onToggleAlwaysOnTop}
        />
        <AppButton
          className="icon-btn titlebar-icon-btn"
          variant="icon"
          aria-label={copy.settings}
          title={copy.settings}
          icon={<SettingsIcon />}
          onClick={onOpenSettings}
        />
        <AppButton
          className="icon-btn titlebar-icon-btn"
          variant="icon"
          aria-label={copy.shortcutHelp}
          title={copy.shortcutHelp}
          icon={<ShortcutHelpIcon />}
          onClick={onOpenShortcutHelp}
        />
        {useAppWindowControls ? (
          <div className="window-controls">
            <AppButton
              variant="icon"
              aria-label={copy.minimize}
              icon={<MinimizeIcon />}
              onClick={onMinimizeWindow}
            />
            <AppButton
              variant="icon"
              aria-label={windowState.isMaximized ? copy.restoreWindow : copy.maximize}
              icon={windowState.isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
              onClick={onToggleMaximizeWindow}
            />
            <AppButton
              className="close"
              variant="icon"
              aria-label={copy.close}
              icon={<CloseIcon />}
              onClick={onCloseWindow}
            />
          </div>
        ) : null}
      </div>
    </header>
  );
}
