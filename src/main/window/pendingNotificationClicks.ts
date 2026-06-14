// 待发通知点击队列。
// 作用：
// 1. 保存新窗口 renderer 尚未 ready 时产生的通知点击 noteId。
// 2. 让 renderer 挂载后通过明确 IPC 一次性领取待处理点击。
// 3. 避免主进程在新窗口加载完成前直接发送消息导致丢失。

export interface PendingNotificationClicks {
  enqueue: (noteId: string) => void;
  flush: () => string[];
  hasPending: () => boolean;
}

export function createPendingNotificationClicks(): PendingNotificationClicks {
  const pendingNoteIds: string[] = [];

  return {
    enqueue: (noteId) => {
      pendingNoteIds.push(noteId);
    },
    flush: () => pendingNoteIds.splice(0),
    hasPending: () => pendingNoteIds.length > 0,
  };
}
