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

export function parseSearchQuery(query: string): ParsedSearchQuery {
  const textParts: string[] = [];
  const tags: string[] = [];
  const matchedPriorities: NotePriority[] = [];
  let due: DueSearchFilter | null = null;

  for (const token of query.trim().split(/\s+/)) {
    if (!token) continue;
    const lowerToken = token.toLowerCase();

    if (lowerToken.startsWith("tag:")) {
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
