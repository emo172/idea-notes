// 主进程截止提醒调度器测试。
// 作用：
// 1. 验证调度器会为到期提醒发送桌面通知。
// 2. 验证通知后写回 reminder key，避免同一提醒重复触发。
import { afterEach, describe, expect, it, vi } from "vitest";
import { getDefaultData } from "@shared/defaultData";
import type { IdeaNotesData } from "@shared/types";

const notificationShow = vi.hoisted(() => vi.fn());
// 收集所有通知实例的点击回调，供测试断言与手动触发。
const clickCallbacks = vi.hoisted(() => [] as Array<() => void>);
const notificationConstructor = vi.hoisted(() =>
  vi.fn(function NotificationMock() {
    return {
      show: notificationShow,
      on: (event: string, cb: () => void) => {
        if (event === "click") clickCallbacks.push(cb);
      },
    };
  }),
);
const storeMock = vi.hoisted(() => ({
  readData: vi.fn<() => Promise<IdeaNotesData>>(),
  saveData: vi.fn<(data: IdeaNotesData) => Promise<IdeaNotesData>>(),
}));

vi.mock("electron", () => ({
  Notification: notificationConstructor,
}));

vi.mock("../../src/main/store", () => ({
  readData: storeMock.readData,
  saveData: storeMock.saveData,
}));

const baseTime = Date.parse("2026-05-29T08:00:00.000Z");

async function importScheduler(): Promise<
  typeof import("../../src/main/reminders/reminderScheduler")
> {
  vi.resetModules();
  return import("../../src/main/reminders/reminderScheduler");
}

describe("主进程截止提醒调度器", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    notificationShow.mockReset();
    notificationConstructor.mockClear();
    clickCallbacks.length = 0;
    storeMock.readData.mockReset();
    storeMock.saveData.mockReset();
  });

  it("到达提醒时间时发送通知并写回已提醒 key", async () => {
    const data = getDefaultData(baseTime);
    data.settings.reminders = { enabled: true, leadMinutes: 10 };
    data.notes = [
      {
        ...data.notes[0],
        id: "reminder-note",
        title: "提醒目标",
        dueAt: "2026-05-29T09:00:00",
        notifiedReminderKeys: undefined,
      },
    ];
    storeMock.readData.mockResolvedValue(data);
    storeMock.saveData.mockImplementation(async (nextData) => nextData);
    const { checkRemindersOnce } = await importScheduler();

    await checkRemindersOnce(Date.parse("2026-05-29T08:50:00"));

    expect(notificationConstructor).toHaveBeenCalledWith({
      title: "提醒目标",
      body: "截止时间：2026-05-29T09:00:00",
    });
    expect(notificationShow).toHaveBeenCalledTimes(1);
    expect(storeMock.saveData).toHaveBeenCalledTimes(1);
    expect(storeMock.saveData.mock.calls[0]?.[0].notes[0].notifiedReminderKeys).toEqual(
      ["reminder-note:2026-05-29T09:00:00:10"],
    );
  });

  it("通知显示失败时仍写回已提醒 key 避免重复触发", async () => {
    const data = getDefaultData(baseTime);
    data.settings.reminders = { enabled: true, leadMinutes: 10 };
    data.notes = [
      {
        ...data.notes[0],
        id: "failing-reminder-note",
        title: "失败提醒目标",
        dueAt: "2026-05-29T09:00:00",
        notifiedReminderKeys: undefined,
      },
    ];
    notificationShow.mockImplementation(() => {
      throw new Error("notification failed");
    });
    storeMock.readData.mockResolvedValue(data);
    storeMock.saveData.mockImplementation(async (nextData) => nextData);
    const { checkRemindersOnce } = await importScheduler();

    await checkRemindersOnce(Date.parse("2026-05-29T08:50:00"));

    expect(storeMock.saveData).toHaveBeenCalledTimes(1);
    expect(storeMock.saveData.mock.calls[0]?.[0].notes[0].notifiedReminderKeys).toEqual(
      ["failing-reminder-note:2026-05-29T09:00:00:10"],
    );
  });

  it("通知构造失败时仍写回已提醒 key 避免重复触发", async () => {
    const data = getDefaultData(baseTime);
    data.settings.reminders = { enabled: true, leadMinutes: 10 };
    data.notes = [
      {
        ...data.notes[0],
        id: "constructor-failing-reminder-note",
        title: "构造失败提醒目标",
        dueAt: "2026-05-29T09:00:00",
        notifiedReminderKeys: undefined,
      },
    ];
    notificationConstructor.mockImplementationOnce(() => {
      throw new Error("notification constructor failed");
    });
    storeMock.readData.mockResolvedValue(data);
    storeMock.saveData.mockImplementation(async (nextData) => nextData);
    const { checkRemindersOnce } = await importScheduler();

    await checkRemindersOnce(Date.parse("2026-05-29T08:50:00"));

    expect(notificationConstructor).toHaveBeenCalledTimes(1);
    expect(notificationShow).not.toHaveBeenCalled();
    expect(storeMock.saveData).toHaveBeenCalledTimes(1);
    expect(storeMock.saveData.mock.calls[0]?.[0].notes[0].notifiedReminderKeys).toEqual(
      ["constructor-failing-reminder-note:2026-05-29T09:00:00:10"],
    );
  });

  it("没有应提醒笔记时不发送通知也不写入数据", async () => {
    const data = getDefaultData(baseTime);
    data.settings.reminders = { enabled: false, leadMinutes: 10 };
    storeMock.readData.mockResolvedValue(data);
    const { checkRemindersOnce } = await importScheduler();

    await checkRemindersOnce(Date.parse("2026-05-29T08:50:00"));

    expect(notificationConstructor).not.toHaveBeenCalled();
    expect(storeMock.saveData).not.toHaveBeenCalled();
  });

  it("通知点击时通过回调发送 noteId", async () => {
    const data = getDefaultData(baseTime);
    data.settings.reminders = { enabled: true, leadMinutes: 10 };
    data.notes = [
      {
        ...data.notes[0],
        id: "click-note",
        title: "点击提醒笔记",
        dueAt: "2026-05-29T09:00:00",
        notifiedReminderKeys: undefined,
      },
    ];
    storeMock.readData.mockResolvedValue(data);
    storeMock.saveData.mockImplementation(async (nextData) => nextData);

    const { checkRemindersOnce } = await importScheduler();
    const onNotificationClick = vi.fn();

    await checkRemindersOnce(Date.parse("2026-05-29T08:50:00"), onNotificationClick);

    // 触发所有已注册的点击回调，模拟用户点击通知
    clickCallbacks.forEach((cb) => cb());

    expect(onNotificationClick).toHaveBeenCalledTimes(1);
    expect(onNotificationClick).toHaveBeenCalledWith("click-note");
  });

  it("未提供回调时不注册 click 监听器", async () => {
    const data = getDefaultData(baseTime);
    data.settings.reminders = { enabled: true, leadMinutes: 10 };
    data.notes = [
      {
        ...data.notes[0],
        id: "no-callback-note",
        title: "无回调触发笔记",
        dueAt: "2026-05-29T09:00:00",
        notifiedReminderKeys: undefined,
      },
    ];
    storeMock.readData.mockResolvedValue(data);
    storeMock.saveData.mockImplementation(async (nextData) => nextData);

    const { checkRemindersOnce } = await importScheduler();
    await checkRemindersOnce(Date.parse("2026-05-29T08:50:00"));

    // 无回调提供时，不应注册任何 click 监听器
    expect(clickCallbacks).toHaveLength(0);
  });
});
