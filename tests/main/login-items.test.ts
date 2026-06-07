// Linux 开机自启动集成测试。
// 作用：
// 1. 验证 Linux 下使用 XDG autostart 文件，而不是依赖 Electron 登录项 API。
// 2. 锁定开启和关闭开机自启动时的用户级 desktop 文件行为。
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { App } from "electron";
import { afterEach, describe, expect, it, vi } from "vitest";
import { setStartup } from "../../src/main/startup/loginItems";

const tempHomes: string[] = [];
const originalXdgConfigHome = process.env.XDG_CONFIG_HOME;

function createTempHome(): string {
  const home = mkdtempSync(join(tmpdir(), "idea-notes-startup-"));
  process.env.XDG_CONFIG_HOME = join(home, ".config");
  tempHomes.push(home);
  return home;
}

function createApp(home: string): App {
  return {
    getPath: (name: string) => {
      if (name === "home") return home;
      if (name === "exe") return "/opt/灵感笔记/idea-notes";
      throw new Error(`Unexpected app path: ${name}`);
    },
    getLoginItemSettings: vi.fn(() => ({ openAtLogin: false })),
    setLoginItemSettings: vi.fn(),
  } as unknown as App;
}

describe("开机自启动系统集成", () => {
  afterEach(() => {
    if (originalXdgConfigHome === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = originalXdgConfigHome;
    }
    for (const home of tempHomes.splice(0)) {
      rmSync(home, { recursive: true, force: true });
    }
  });

  it.runIf(process.platform === "linux")(
    "Linux 开启时写入 XDG autostart desktop 文件并返回真实状态",
    () => {
      const home = createTempHome();
      const app = createApp(home);

      const enabled = setStartup(app, true);

      const desktopFile = join(home, ".config", "autostart", "idea-notes.desktop");
      expect(enabled).toBe(true);
      expect(existsSync(desktopFile)).toBe(true);
      expect(readFileSync(desktopFile, "utf8")).toContain(
        'Exec="/opt/灵感笔记/idea-notes" %U',
      );
      expect(readFileSync(desktopFile, "utf8")).toContain(
        "X-GNOME-Autostart-enabled=true",
      );
      expect(app.setLoginItemSettings).not.toHaveBeenCalled();
    },
  );

  it.runIf(process.platform === "linux")("Linux 关闭时删除用户自启动文件", () => {
    const home = createTempHome();
    const app = createApp(home);
    const desktopFile = join(home, ".config", "autostart", "idea-notes.desktop");
    mkdirSync(join(home, ".config", "autostart"), { recursive: true });
    writeFileSync(desktopFile, "[Desktop Entry]\nType=Application\n", "utf8");

    const enabled = setStartup(app, false);

    expect(enabled).toBe(false);
    expect(existsSync(desktopFile)).toBe(false);
    expect(app.setLoginItemSettings).not.toHaveBeenCalled();
  });
});
