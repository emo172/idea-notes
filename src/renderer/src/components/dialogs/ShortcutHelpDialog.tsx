// 快捷键帮助弹窗组件。
// 作用：
// 1. 使用通用 DialogShell 展示当前已支持的全局快捷键。
// 2. 按导航、编辑和视图分类呈现键位说明，供后续触发入口复用。
import type { ReactElement } from "react";
import type { AppCopy } from "../../i18n";
import { DialogShell } from "./DialogShell";
import { AppButton } from "../ui/AppButton";

interface ShortcutHelpDialogProps {
  copy: AppCopy;
  onClose: () => void;
}

interface ShortcutDef {
  keys: string;
  description: string;
  category: string;
}

type ShortcutCategoryKey =
  | "shortcutCategoryNavigation"
  | "shortcutCategoryEditing"
  | "shortcutCategoryView";

interface ShortcutCategory {
  key: ShortcutCategoryKey;
  label: string;
}

const SHORTCUTS: ShortcutDef[] = [
  { keys: "Ctrl/Cmd+F", description: "聚焦搜索框", category: "navigation" },
  { keys: "Ctrl/Cmd+N", description: "新建笔记", category: "editing" },
  { keys: "Ctrl/Cmd+S", description: "保存当前编辑", category: "editing" },
  { keys: "Ctrl/Cmd+1", description: "切换到进行中视图", category: "view" },
  { keys: "Ctrl/Cmd+2", description: "切换到已完成视图", category: "view" },
  { keys: "Ctrl/Cmd+3", description: "切换到归档视图", category: "view" },
  { keys: "Ctrl/Cmd+4", description: "切换到回收站视图", category: "view" },
];

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  { key: "shortcutCategoryNavigation", label: "navigation" },
  { key: "shortcutCategoryEditing", label: "editing" },
  { key: "shortcutCategoryView", label: "view" },
];

export function ShortcutHelpDialog({
  copy,
  onClose,
}: ShortcutHelpDialogProps): ReactElement {
  return (
    <DialogShell
      title={copy.shortcutHelp}
      titleId="shortcut-help-title"
      describedBy="shortcut-help-description"
      overlayClassName="shortcut-help-overlay"
      panelClassName="shortcut-help-panel"
      headerClassName="shortcut-help-head"
      bodyClassName="shortcut-help-body"
      actionsClassName="shortcut-help-actions"
      actions={<AppButton onClick={onClose}>{copy.close}</AppButton>}
      onEscape={onClose}
    >
      <p id="shortcut-help-description" className="shortcut-help-intro">
        当前可用的全局快捷键。
      </p>
      <div className="shortcut-groups">
        {SHORTCUT_CATEGORIES.map((category) => (
          <section className="shortcut-group" key={category.label}>
            <h3 className="shortcut-category">{copy[category.key]}</h3>
            <dl className="shortcut-list">
              {SHORTCUTS.filter((shortcut) => shortcut.category === category.label).map(
                (shortcut) => (
                  <div className="shortcut-row" key={shortcut.keys}>
                    <dt>
                      <kbd>{shortcut.keys}</kbd>
                    </dt>
                    <dd>{shortcut.description}</dd>
                  </div>
                ),
              )}
            </dl>
          </section>
        ))}
      </div>
    </DialogShell>
  );
}
