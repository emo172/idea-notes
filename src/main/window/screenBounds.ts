// 窗口显示区域判断工具。
// 作用：
// 1. 提供不依赖 Electron 运行时的显示器坐标纯逻辑。
// 2. 让窗口位置恢复逻辑可在 CI 中稳定单元测试。

export interface DisplayWorkArea {
  workArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// 校验给定的 x/y 坐标是否至少在一个显示器的 workArea 内。
// 使用 workArea 而非 bounds 可避开任务栏等系统 UI 遮挡区域。
export function isPositionOnScreen(
  x: number,
  y: number,
  displays: DisplayWorkArea[],
): boolean {
  return displays.some((d) => {
    const wa = d.workArea;
    return x >= wa.x && y >= wa.y && x < wa.x + wa.width && y < wa.y + wa.height;
  });
}
