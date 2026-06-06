// React 渲染层阶段 5 结构守护。
// 作用：
// 1. 锁定 App 状态编排、编辑器和弹窗焦点逻辑的拆分边界。
// 2. 避免后续把已拆出的命令 hook、编辑器子结构和焦点陷阱重新塞回大组件。
// 3. 用统一单文件行数上限替代主组件的 Prettier 敏感行数断言。
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const codeExtensions = new Set([".ts", ".tsx", ".css"]);
const ignoredDirectories = new Set([".omo", "docs", "node_modules", "out", "release"]);

function collectCodeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignoredDirectories.has(entry.name)) return [];

    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) return collectCodeFiles(entryPath);
    if (entry.isFile() && codeExtensions.has(extname(entry.name))) return [entryPath];
    return [];
  });
}

function countLines(source: string): number {
  return source.split("\n").length;
}

describe("App renderer stage 5 structure", () => {
  it("IdeaNotesApp 只保留主界面接线职责", () => {
    const appPath = resolve("src/renderer/src/app/IdeaNotesApp.tsx");
    const appSource = readFileSync(appPath, "utf8");

    expect(appSource).toContain('import { AppOverlays } from "./AppOverlays";');
    expect(appSource).toContain('import { AppMainContent } from "./AppMainContent";');
    for (const hookName of [
      "useWindowControls",
      "useNoteCommands",
      "useTagCommands",
      "useSettingsCommands",
      "useNoteEditor",
    ]) {
      expect(appSource).toContain(`${hookName}(`);
    }
  });

  it("源码和测试单文件代码量小于 1000 行", () => {
    const oversizedFiles = ["src", "tests"]
      .flatMap((directory) => collectCodeFiles(resolve(directory)))
      .map((filePath) => ({
        filePath,
        lineCount: countLines(readFileSync(filePath, "utf8")),
      }))
      .filter(({ lineCount }) => lineCount >= 1000);

    expect(oversizedFiles).toEqual([]);
  });

  it("编辑器按主字段、侧栏和动作区拆分", () => {
    const editorPath = resolve("src/renderer/src/components/editor");
    const editorSource = readFileSync(resolve(editorPath, "EditorDialog.tsx"), "utf8");

    for (const file of [
      "EditorDialogActions.tsx",
      "EditorMainFields.tsx",
      "EditorSidePanel.tsx",
    ]) {
      expect(existsSync(resolve(editorPath, file))).toBe(true);
    }
    expect(editorSource).toContain(
      'import { EditorDialogActions } from "./EditorDialogActions";',
    );
    expect(editorSource).toContain(
      'import { EditorMainFields } from "./EditorMainFields";',
    );
    expect(editorSource).toContain(
      'import { EditorSidePanel } from "./EditorSidePanel";',
    );
    expect(editorSource).not.toContain("const lineNumbers =");
    expect(editorSource).not.toContain('className="editor-textarea"');
    expect(editorSource).not.toContain('className="editor-side"');
  });

  it("DialogShell 通过 useFocusTrap 管理焦点循环", () => {
    const hookPath = resolve("src/renderer/src/hooks/useFocusTrap.ts");
    const dialogSource = readFileSync(
      resolve("src/renderer/src/components/dialogs/DialogShell.tsx"),
      "utf8",
    );

    expect(existsSync(hookPath)).toBe(true);
    expect(dialogSource).toContain(
      'import { useFocusTrap } from "../../hooks/useFocusTrap";',
    );
    expect(dialogSource).toContain("useFocusTrap(");
    expect(dialogSource).not.toContain("FOCUSABLE_SELECTOR");
    expect(dialogSource).not.toContain("function getFocusableElements");
  });
});
