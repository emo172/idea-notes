// IdeaNotesData 运行时结构校验测试。
// 作用：
// 1. 锁定主进程保存 IPC payload 的最小可信结构。
// 2. 确保非法根对象、笔记、设置、枚举和时间戳不会通过校验。
// 3. 允许旧本地数据残留额外字段，避免迁移期间误伤用户数据。
import { describe, expect, it } from "vitest";
import { defaultSettings, getDefaultData } from "@shared/defaultData";
import {
  sanitizeIdeaNotesData,
  validateIdeaNotesData,
} from "@shared/ideaNotesDataValidation";

const baseTime = Date.parse("2026-05-29T08:00:00.000Z");

function validDataWithExtraFields(): unknown {
  const data = getDefaultData(baseTime);
  const checklistWithLegacyFields = data.notes[0].checklist.map((item) => ({
    ...item,
    legacyChecklistField: "保留但不消费",
  }));
  return {
    ...data,
    legacyRootField: "保留但不消费",
    tags: [{ id: "tag-work", name: "工作", color: " #10B981 " }],
    settings: {
      ...data.settings,
      backgroundColor: "#102030",
      legacySetting: true,
    },
    notes: [
      {
        ...data.notes[0],
        id: "active-with-previous",
        status: "active",
        previousStatus: "completed",
        legacyNoteField: "保留但不消费",
        checklist: checklistWithLegacyFields,
      },
      {
        ...data.notes[0],
        id: "trash-with-previous",
        status: "trash",
        trashedAt: baseTime,
        previousStatus: "archive",
        legacyNoteField: "保留但不消费",
        checklist: checklistWithLegacyFields,
      },
    ],
  };
}

describe("validateIdeaNotesData", () => {
  it("默认设置包含窗口启动和托盘行为字段", () => {
    expect(defaultSettings.silentStart).toBe(false);
    expect(defaultSettings.minimizeToTrayOnClose).toBe(false);
    expect(defaultSettings.appWindowControls).toBe(true);
  });

  it("接受合法数据并允许对象携带额外字段", () => {
    expect(validateIdeaNotesData(validDataWithExtraFields())).toBe(true);
  });

  it("接受带颜色的全局标签对象", () => {
    const data = getDefaultData(baseTime);

    expect(
      validateIdeaNotesData({
        ...data,
        tags: [{ id: "tag-work", name: "工作", color: "#2563eb" }],
      }),
    ).toBe(true);
  });

  it("接受归档状态笔记", () => {
    const data = getDefaultData(baseTime);

    expect(
      validateIdeaNotesData({
        ...data,
        notes: [{ ...data.notes[0], status: "archive" }],
      }),
    ).toBe(true);
  });

  it("接受提醒设置和笔记已提醒 key", () => {
    const data = getDefaultData(baseTime);

    expect(
      validateIdeaNotesData({
        ...data,
        settings: {
          ...data.settings,
          reminders: { enabled: true, leadMinutes: 60 },
        },
        notes: [
          {
            ...data.notes[0],
            notifiedReminderKeys: [
              `${data.notes[0].id}:${data.notes[0].dueAt ?? ""}:60`,
            ],
          },
        ],
      }),
    ).toBe(true);
  });

  it("清理已删除的背景设置字段、保留其它旧字段并归一化标签颜色", () => {
    const data = validDataWithExtraFields();
    if (!validateIdeaNotesData(data)) throw new Error("测试数据应通过校验");

    const sanitized = sanitizeIdeaNotesData(data);

    expect(sanitized.tags[0]?.color).toBe("#10b981");
    expect(sanitized.settings).not.toHaveProperty("backgroundColor");
    expect(sanitized.settings).toHaveProperty("legacySetting", true);
    expect(sanitized.notes[0]).not.toHaveProperty("previousStatus");
    expect(sanitized.notes[0]).toHaveProperty("legacyNoteField", "保留但不消费");
    expect(sanitized.notes[1]?.previousStatus).toBe("archive");
    expect(sanitized.notes[1]).toHaveProperty("legacyNoteField", "保留但不消费");
  });

  it.each([
    null,
    undefined,
    "not-data",
    [],
    { tags: [], settings: {}, notes: "not-array" },
  ])("拒绝非法根对象 %#", (value) => {
    expect(validateIdeaNotesData(value)).toBe(false);
  });

  it.each([
    { field: "id", value: 123 },
    { field: "title", value: null },
    { field: "body", value: false },
    { field: "priority", value: "urgent" },
    { field: "status", value: "archived" },
    { field: "tags", value: ["工作", 1] },
    { field: "checklist", value: [{ id: "item-1", text: "任务" }] },
  ])("拒绝非法笔记字段 $field", ({ field, value }) => {
    const data = getDefaultData(baseTime);
    expect(
      validateIdeaNotesData({
        ...data,
        notes: [{ ...data.notes[0], [field]: value }],
      }),
    ).toBe(false);
  });

  it.each([
    { field: "themeMode", value: "sepia" },
    { field: "startup", value: "yes" },
    { field: "silentStart", value: "yes" },
    { field: "minimizeToTrayOnClose", value: "yes" },
    { field: "appWindowControls", value: "yes" },
    { field: "trashAutoDelete", value: "14" },
    { field: "language", value: "fr" },
    { field: "reminders", value: { enabled: true, leadMinutes: 30 } },
    { field: "reminders", value: { enabled: "yes", leadMinutes: 10 } },
  ])("拒绝非法设置字段 $field", ({ field, value }) => {
    const data = getDefaultData(baseTime);
    expect(
      validateIdeaNotesData({
        ...data,
        settings: { ...data.settings, [field]: value },
      }),
    ).toBe(false);
  });

  it.each([
    { field: "createdAt", value: "now" },
    { field: "updatedAt", value: Number.NaN },
    { field: "trashedAt", value: "yesterday" },
    { field: "notifiedReminderKeys", value: ["ok", 1] },
  ])("拒绝非法时间戳字段 $field", ({ field, value }) => {
    const data = getDefaultData(baseTime);
    expect(
      validateIdeaNotesData({
        ...data,
        notes: [{ ...data.notes[0], [field]: value }],
      }),
    ).toBe(false);
  });

  it.each([
    { name: "缺少 id", tag: { name: "工作", color: "#2563eb" } },
    { name: "缺少 name", tag: { id: "tag-work", color: "#2563eb" } },
    { name: "缺少 color", tag: { id: "tag-work", name: "工作" } },
    { name: "非法 color", tag: { id: "tag-work", name: "工作", color: 123 } },
    {
      name: "非法 color 字符串",
      tag: { id: "tag-work", name: "工作", color: "not-a-color" },
    },
  ])("拒绝非法标签对象：$name", ({ tag }) => {
    const data = getDefaultData(baseTime);

    expect(validateIdeaNotesData({ ...data, tags: [tag] })).toBe(false);
  });

  it.each([
    {
      name: "根 tags",
      buildData: () => ({
        ...getDefaultData(baseTime),
        tags: Array(1),
      }),
    },
    {
      name: "根 notes",
      buildData: () => ({
        ...getDefaultData(baseTime),
        notes: Array(1),
      }),
    },
    {
      name: "笔记 tags",
      buildData: () => {
        const data = getDefaultData(baseTime);
        return {
          ...data,
          notes: [{ ...data.notes[0], tags: Array(1) }],
        };
      },
    },
    {
      name: "笔记 checklist",
      buildData: () => {
        const data = getDefaultData(baseTime);
        return {
          ...data,
          notes: [{ ...data.notes[0], checklist: Array(1) }],
        };
      },
    },
  ])("拒绝稀疏数组空槽：$name", ({ buildData }) => {
    expect(validateIdeaNotesData(buildData())).toBe(false);
  });
});

describe("新字段默认值", () => {
  it("defaultSettings 包含 fontFamily: system", () => {
    expect(defaultSettings.fontFamily).toBe("system");
  });

  it("defaultSettings 包含 fontSize: 14", () => {
    expect(defaultSettings.fontSize).toBe(14);
  });

  it("默认笔记示例包含 pinned: false", () => {
    const data = getDefaultData(baseTime);
    for (const note of data.notes) {
      expect(note.pinned).toBe(false);
    }
  });
});

describe("validateIdeaNotesData 新字段", () => {
  it("接受合法 pinned 字段（true）", () => {
    const data = getDefaultData(baseTime);
    expect(
      validateIdeaNotesData({
        ...data,
        notes: [{ ...data.notes[0], pinned: true, updatedAt: baseTime }],
      }),
    ).toBe(true);
  });

  it("接受合法 pinned 字段（false）", () => {
    const data = getDefaultData(baseTime);
    expect(
      validateIdeaNotesData({
        ...data,
        notes: [{ ...data.notes[0], pinned: false, updatedAt: baseTime }],
      }),
    ).toBe(true);
  });

  it("接受合法 fontFamily/fontSize 字段", () => {
    const data = getDefaultData(baseTime);
    expect(
      validateIdeaNotesData({
        ...data,
        settings: { ...data.settings, fontFamily: "system", fontSize: 14 },
      }),
    ).toBe(true);
  });

  it("接受合法 windowBounds 字段（含 x/y）", () => {
    const data = getDefaultData(baseTime);
    expect(
      validateIdeaNotesData({
        ...data,
        settings: {
          ...data.settings,
          windowBounds: {
            x: 100,
            y: 200,
            width: 1000,
            height: 700,
            isMaximized: false,
          },
        },
      }),
    ).toBe(true);
  });

  it("接受合法 windowBounds 字段（不含 x/y）", () => {
    const data = getDefaultData(baseTime);
    expect(
      validateIdeaNotesData({
        ...data,
        settings: {
          ...data.settings,
          windowBounds: { width: 1000, height: 700, isMaximized: true },
        },
      }),
    ).toBe(true);
  });

  it("接受缺失新字段（向后兼容）", () => {
    expect(validateIdeaNotesData(getDefaultData(baseTime))).toBe(true);
  });

  it("拒绝非布尔 pinned", () => {
    const data = getDefaultData(baseTime);
    expect(
      validateIdeaNotesData({
        ...data,
        notes: [
          {
            ...data.notes[0],
            pinned: "yes" as unknown as boolean,
            updatedAt: baseTime,
          },
        ],
      }),
    ).toBe(false);
  });

  it("拒绝非字符串 fontFamily", () => {
    const data = getDefaultData(baseTime);
    expect(
      validateIdeaNotesData({
        ...data,
        settings: { ...data.settings, fontFamily: 123 },
      }),
    ).toBe(false);
  });

  it("拒绝非数字 fontSize（字符串）", () => {
    const data = getDefaultData(baseTime);
    expect(
      validateIdeaNotesData({
        ...data,
        settings: { ...data.settings, fontSize: "large" },
      }),
    ).toBe(false);
  });

  it("拒绝非数字 fontSize（NaN）", () => {
    const data = getDefaultData(baseTime);
    expect(
      validateIdeaNotesData({
        ...data,
        settings: { ...data.settings, fontSize: Number.NaN },
      }),
    ).toBe(false);
  });

  it("拒绝缺少 width 的 windowBounds", () => {
    const data = getDefaultData(baseTime);
    expect(
      validateIdeaNotesData({
        ...data,
        settings: {
          ...data.settings,
          windowBounds: { height: 700, isMaximized: false } as Record<string, unknown>,
        },
      }),
    ).toBe(false);
  });

  it("拒绝缺少 height 的 windowBounds", () => {
    const data = getDefaultData(baseTime);
    expect(
      validateIdeaNotesData({
        ...data,
        settings: {
          ...data.settings,
          windowBounds: { width: 1000, isMaximized: false } as Record<string, unknown>,
        },
      }),
    ).toBe(false);
  });

  it("拒绝缺少 isMaximized 的 windowBounds", () => {
    const data = getDefaultData(baseTime);
    expect(
      validateIdeaNotesData({
        ...data,
        settings: {
          ...data.settings,
          windowBounds: { width: 1000, height: 700 } as Record<string, unknown>,
        },
      }),
    ).toBe(false);
  });

  it("拒绝非布尔 isMaximized", () => {
    const data = getDefaultData(baseTime);
    expect(
      validateIdeaNotesData({
        ...data,
        settings: {
          ...data.settings,
          windowBounds: { width: 1000, height: 700, isMaximized: "yes" },
        },
      }),
    ).toBe(false);
  });

  it("拒绝非数字 windowBounds.width", () => {
    const data = getDefaultData(baseTime);
    expect(
      validateIdeaNotesData({
        ...data,
        settings: {
          ...data.settings,
          windowBounds: { width: "1000", height: 700, isMaximized: false },
        },
      }),
    ).toBe(false);
  });

  it("拒绝非数字 windowBounds.x（字符串）", () => {
    const data = getDefaultData(baseTime);
    expect(
      validateIdeaNotesData({
        ...data,
        settings: {
          ...data.settings,
          windowBounds: {
            x: "left" as unknown as number,
            y: 200,
            width: 1000,
            height: 700,
            isMaximized: false,
          },
        },
      }),
    ).toBe(false);
  });
});
