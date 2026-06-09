// 搜索查询解析纯逻辑。
// 作用：
// 1. 把搜索框里的普通关键词与 tag/priority/due 字段语法拆开。
// 2. 让筛选逻辑和渲染层高亮复用同一套解析结果，避免语义漂移。
import type { NotePriority } from "../types";

export type DueSearchFilter = "overdue" | "pending" | "none";

export interface ParsedSearchQuery {
  text: string;
  tags: string[];
  priorities: NotePriority[];
  due: DueSearchFilter | null;
}

const priorities = new Set<NotePriority>(["high", "medium", "low"]);
const dueFilters = new Set<DueSearchFilter>(["overdue", "pending", "none"]);

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function tokenizeSearchQuery(query: string): string[] {
  const tokens: string[] = [];
  let index = 0;

  while (index < query.length) {
    while (/\s/.test(query[index] ?? "")) index += 1;
    if (index >= query.length) break;

    const rest = query.slice(index);
    if (rest.toLowerCase().startsWith('tag:"')) {
      const closingQuoteIndex = query.indexOf('"', index + 'tag:"'.length);
      if (closingQuoteIndex !== -1) {
        tokens.push(query.slice(index, closingQuoteIndex + 1));
        index = closingQuoteIndex + 1;
        continue;
      }
    }

    const nextSpaceMatch = query.slice(index).match(/\s/);
    if (!nextSpaceMatch?.index) {
      tokens.push(query.slice(index));
      break;
    }
    tokens.push(query.slice(index, index + nextSpaceMatch.index));
    index += nextSpaceMatch.index;
  }

  return tokens;
}

export function parseSearchQuery(query: string): ParsedSearchQuery {
  const textParts: string[] = [];
  const tags: string[] = [];
  const matchedPriorities: NotePriority[] = [];
  let due: DueSearchFilter | null = null;

  for (const token of tokenizeSearchQuery(query.trim())) {
    if (!token) continue;
    const lowerToken = token.toLowerCase();

    if (lowerToken.startsWith('tag:"') && token.endsWith('"')) {
      const tag = token.slice('tag:"'.length, -1).trim();
      if (tag) tags.push(tag);
      continue;
    }

    if (lowerToken.startsWith("tag:")) {
      if (token.includes('"')) {
        textParts.push(token);
        continue;
      }
      const tag = token.slice("tag:".length).trim();
      if (tag) tags.push(tag);
      continue;
    }

    if (lowerToken.startsWith("priority:")) {
      const priority = lowerToken.slice("priority:".length);
      if (priorities.has(priority as NotePriority)) {
        matchedPriorities.push(priority as NotePriority);
      }
      continue;
    }

    if (lowerToken.startsWith("due:")) {
      const dueFilter = lowerToken.slice("due:".length);
      if (dueFilters.has(dueFilter as DueSearchFilter)) {
        due = dueFilter as DueSearchFilter;
      }
      continue;
    }

    textParts.push(token);
  }

  return {
    text: textParts.join(" "),
    tags: unique(tags),
    priorities: unique(matchedPriorities),
    due,
  };
}
