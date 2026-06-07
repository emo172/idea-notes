// 编辑器主输入区组件。
// 作用：
// 1. 渲染标题和正文输入区域。
// 2. 维护正文行号展示，避免编辑器组合层处理输入细节。
import { useRef, useState } from "react";
import type { Dispatch, ReactElement, SetStateAction } from "react";
import type { NoteDraft } from "@shared/types";
import type { AppCopy } from "../../i18n";
import { renderMarkdownPreview } from "../../utils/markdownPreview";

interface EditorMainFieldsProps {
  draft: NoteDraft;
  copy: AppCopy;
  setDraft: Dispatch<SetStateAction<NoteDraft>>;
  isSaving: boolean;
}

export function EditorMainFields({
  draft,
  copy,
  setDraft,
  isSaving,
}: EditorMainFieldsProps): ReactElement {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const lineNumbersRef = useRef<HTMLDivElement | null>(null);
  // 行号至少保留三行，空白新笔记也能呈现接近真实编辑器的输入基线。
  const lineNumbers = Array.from(
    { length: Math.max(3, draft.body.split("\n").length) },
    (_, index) => index + 1,
  );

  function syncLineNumberScroll(scrollTop: number): void {
    if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = scrollTop;
  }

  return (
    <div className="editor-main">
      <label className="form-field">
        <span>{copy.title}</span>
        <input
          aria-label={copy.title}
          disabled={isSaving}
          value={draft.title}
          onChange={(event) =>
            setDraft((currentDraft) => ({
              ...currentDraft,
              title: event.target.value,
            }))
          }
          placeholder={copy.titlePlaceholder}
        />
      </label>
      <div className="form-field grow">
        <div className="editor-body-head">
          <span>{copy.body}</span>
          <div
            className="editor-mode-switch"
            role="group"
            aria-label={copy.markdownMode}
          >
            <button
              className={mode === "edit" ? "active" : ""}
              type="button"
              disabled={isSaving}
              onClick={() => setMode("edit")}
            >
              {copy.markdownEdit}
            </button>
            <button
              className={mode === "preview" ? "active" : ""}
              type="button"
              disabled={isSaving}
              onClick={() => setMode("preview")}
            >
              {copy.markdownPreview}
            </button>
          </div>
        </div>
        {mode === "edit" ? (
          <div className="editor-textarea-container">
            <div className="line-numbers" aria-hidden="true" ref={lineNumbersRef}>
              {lineNumbers.map((lineNumber) => (
                <span key={lineNumber}>{lineNumber}</span>
              ))}
            </div>
            <textarea
              aria-label={copy.body}
              className="editor-textarea"
              disabled={isSaving}
              value={draft.body}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  body: event.target.value,
                }))
              }
              onScroll={(event) => syncLineNumberScroll(event.currentTarget.scrollTop)}
              placeholder={copy.bodyPlaceholder}
            />
          </div>
        ) : (
          <section className="markdown-preview" aria-label={copy.markdownPreviewRegion}>
            {renderMarkdownPreview(draft.body)}
          </section>
        )}
      </div>
    </div>
  );
}
