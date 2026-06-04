// 系统主题偏好 hook。
// 作用：
// 1. 读取浏览器 prefers-color-scheme 暗色偏好，供渲染层主题模式判断使用。
// 2. 监听系统主题变化，并在组件卸载时移除监听。
import { useEffect, useState } from "react";

const darkModeQuery = "(prefers-color-scheme: dark)";

function getSystemPrefersDark(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia(darkModeQuery).matches
  );
}

export function useSystemTheme(): boolean {
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    getSystemPrefersDark,
  );

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia(darkModeQuery);
    const handleChange = (event: MediaQueryListEvent): void => {
      setSystemPrefersDark(event.matches);
    };
    setSystemPrefersDark(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return systemPrefersDark;
}
