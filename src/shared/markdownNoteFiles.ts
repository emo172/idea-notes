// Markdown 笔记文件纯逻辑。
// 作用：
// 1. 将常见 Markdown 文件尽量解析为笔记草稿。
// 2. 将单条笔记序列化为可保存的 Markdown 文件内容。
// 3. 生成跨平台安全的 Markdown 导出文件名。
import type { IdeaNote, NoteDraft, NotePriority } from "./types";

export interface ParsedMarkdownNoteDraft extends NoteDraft {
  checkedStates: boolean[];
  priority: NotePriority;
  tags: string[];
}

interface ParseMarkdownNoteDraftInput {
  fileName: string;
  markdown: string;
  fallbackTitle: string;
}

interface IdeaNotesMarkdownMetadata {
  priority?: NotePriority;
  tags?: string[];
  checkedStates?: boolean[];
}

const markdownExtensionPattern = /\.(md|markdown)$/i;
const headingPattern = /^#\s+(.+)$/;
const taskPattern = /^([-*+])\s+\[([xX ])\]\s+(.*)$/;
const metadataPattern = /^<!--\s*idea-notes:\s*(.+)\s*-->$/;
const unsafeFileNamePattern = /[<>:"/\\|?*]+/g;

export function parseMarkdownNoteDraft({
  fileName,
  markdown,
  fallbackTitle,
}: ParseMarkdownNoteDraftInput): ParsedMarkdownNoteDraft {
  const normalizedMarkdown = normalizeNewlines(markdown);
  const lines = normalizedMarkdown.split("\n");
  const { title, bodyLines, metadata } = extractMarkdownNoteParts(
    lines,
    fileName,
    fallbackTitle,
  );

  if (metadata) {
    const body = bodyLines.join("\n");
    return {
      title,
      body,
      priority: metadata.priority ?? "medium",
      tags: metadata.tags ?? [],
      checkedStates: metadata.checkedStates ?? buildFallbackCheckedStates(bodyLines),
    };
  }

  const checkedStates: boolean[] = [];
  for (const line of bodyLines) {
    const taskMatch = taskPattern.exec(line.trim());
    if (taskMatch) {
      checkedStates.push(taskMatch[2].toLowerCase() === "x");
      continue;
    }
    if (line.trim().length > 0) checkedStates.push(false);
  }

  return {
    title,
    body: bodyLines.join("\n"),
    priority: "medium",
    tags: [],
    checkedStates,
  };
}

export function serializeNoteToMarkdown(note: IdeaNote): string {
  const metadata: IdeaNotesMarkdownMetadata = {
    priority: note.priority,
    tags: note.tags,
    checkedStates: note.checklist
      .filter((item) => item.text.trim().length > 0)
      .map((item) => item.checked),
  };
  const body = normalizeNewlines(note.body).trimEnd();
  const header = [
    `# ${note.title.trim() || "未命名笔记"}`,
    `<!-- idea-notes: ${JSON.stringify(metadata)} -->`,
  ].join("\n");
  return body ? `${header}\n\n${body}\n` : `${header}\n`;
}

export function buildMarkdownExportFileName(
  title: string,
  fallbackTitle: string,
): string {
  const safeName = removeControlCharacters(normalizeTitle(title, fallbackTitle))
    .replace(unsafeFileNamePattern, "-")
    .replace(/\s+/g, " ")
    .replace(/-+/g, "-")
    .replace(/^[-.\s]+|[-.\s]+$/g, "");
  return `${safeName || fallbackTitle}.md`;
}

function removeControlCharacters(value: string): string {
  return Array.from(value)
    .filter((char) => {
      const codePoint = char.codePointAt(0) ?? 0;
      return codePoint >= 32;
    })
    .join("");
}

export function isMarkdownFilePath(filePath: string): boolean {
  return markdownExtensionPattern.test(filePath);
}

function extractMarkdownNoteParts(
  lines: string[],
  fileName: string,
  fallbackTitle: string,
): {
  title: string;
  bodyLines: string[];
  metadata: IdeaNotesMarkdownMetadata | null;
} {
  let title = "";
  let titleLineIndex = -1;
  let inCodeBlock = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    const headingMatch = headingPattern.exec(line.trim());
    if (headingMatch) {
      title = headingMatch[1].trim();
      titleLineIndex = index;
      break;
    }
  }

  const metadataLineIndex = lines.findIndex((line) =>
    metadataPattern.test(line.trim()),
  );
  const metadataMatch =
    metadataLineIndex >= 0
      ? metadataPattern.exec(lines[metadataLineIndex]?.trim() ?? "")
      : null;
  const metadata = metadataMatch ? parseMetadata(metadataMatch[1] ?? "") : null;

  const bodyLines = trimBoundaryBlankLines(
    lines.filter(
      (line, index) => index !== titleLineIndex && index !== metadataLineIndex,
    ),
  );
  return {
    title: normalizeTitle(title || stripExtension(fileName), fallbackTitle),
    bodyLines,
    metadata,
  };
}

function parseMetadata(rawValue: string): IdeaNotesMarkdownMetadata | null {
  try {
    const parsed = JSON.parse(rawValue) as IdeaNotesMarkdownMetadata;
    return {
      priority:
        parsed.priority === "high" ||
        parsed.priority === "medium" ||
        parsed.priority === "low"
          ? parsed.priority
          : undefined,
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.filter(
            (tag): tag is string => typeof tag === "string" && tag.trim().length > 0,
          )
        : undefined,
      checkedStates: Array.isArray(parsed.checkedStates)
        ? parsed.checkedStates.map((checked) => checked === true)
        : undefined,
    };
  } catch {
    return null;
  }
}

function buildFallbackCheckedStates(bodyLines: string[]): boolean[] {
  return bodyLines.filter((line) => line.trim().length > 0).map(() => false);
}

function trimBoundaryBlankLines(lines: string[]): string[] {
  let startIndex = 0;
  let endIndex = lines.length;
  while (startIndex < endIndex && (lines[startIndex] ?? "").trim().length === 0) {
    startIndex += 1;
  }
  while (endIndex > startIndex && (lines[endIndex - 1] ?? "").trim().length === 0) {
    endIndex -= 1;
  }
  return lines.slice(startIndex, endIndex);
}

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function normalizeTitle(value: string, fallbackTitle: string): string {
  const title = value.trim();
  return title || fallbackTitle;
}

function stripExtension(fileName: string): string {
  return fileName.replace(/\.(md|markdown)$/i, "");
}
