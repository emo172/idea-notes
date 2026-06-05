// IdeaNotesData 运行时结构校验测试。
// 作用：
// 1. 锁定主进程保存 IPC payload 的最小可信结构。
// 2. 确保非法根对象、笔记、设置、枚举和时间戳不会通过校验。
// 3. 允许旧本地数据残留额外字段，避免迁移期间误伤用户数据。
import { describe, expect, it } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import {
  sanitizeIdeaNotesData,
  validateIdeaNotesData,
} from "@shared/ideaNotesDataValidation";

const baseTime = Date.parse("2026-05-29T08:00:00.000Z");

function validDataWithExtraFields(): unknown {
  const data = getDefaultData(baseTime);
  return {
    ...data,
    legacyRootField: "保留但不消费",
    settings: {
      ...data.settings,
      backgroundColor: "#102030",
      legacySetting: true,
    },
    notes: data.notes.map((note) => ({
      ...note,
      legacyNoteField: "保留但不消费",
      checklist: note.checklist.map((item) => ({
        ...item,
        legacyChecklistField: "保留但不消费",
      })),
    })),
  };
}

describe("validateIdeaNotesData", () => {
  it("接受合法数据并允许对象携带额外字段", () => {
    expect(validateIdeaNotesData(validDataWithExtraFields())).toBe(true);
  });

  it("清理已删除的背景设置字段但保留其它旧字段", () => {
    const data = validDataWithExtraFields();
    if (!validateIdeaNotesData(data)) throw new Error("测试数据应通过校验");

    const sanitized = sanitizeIdeaNotesData(data);

    expect(sanitized.settings).not.toHaveProperty("backgroundColor");
    expect(sanitized.settings).toHaveProperty("legacySetting", true);
    expect(sanitized.notes[0]).toHaveProperty("legacyNoteField", "保留但不消费");
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
    { field: "trashAutoDelete", value: "14" },
    { field: "language", value: "fr" },
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
