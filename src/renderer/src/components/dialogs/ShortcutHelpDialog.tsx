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
  descriptionKey: keyof AppCopy["shortcutDescriptions"];
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
  { keys: "Ctrl/Cmd+F", descriptionKey: "search", category: "navigation" },
  { keys: "F1", descriptionKey: "help", category: "navigation" },
  { keys: "Ctrl/Cmd+/", descriptionKey: "help", category: "navigation" },
  { keys: "Ctrl/Cmd+N", descriptionKey: "newNoteInList", category: "editing" },
  { keys: "Ctrl/Cmd+S", descriptionKey: "saveEditor", category: "editing" },
  { keys: "Ctrl/Cmd+1", descriptionKey: "viewActiveInList", category: "view" },
  { keys: "Ctrl/Cmd+2", descriptionKey: "viewCompletedInList", category: "view" },
  { keys: "Ctrl/Cmd+3", descriptionKey: "viewArchiveInList", category: "view" },
  { keys: "Ctrl/Cmd+4", descriptionKey: "viewTrashInList", category: "view" },
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
        {copy.shortcutIntro}
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
                    <dd>{copy.shortcutDescriptions[shortcut.descriptionKey]}</dd>
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
