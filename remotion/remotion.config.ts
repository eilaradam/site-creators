import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

// Resolve a Chrome binary for rendering.
// In restricted remote environments Remotion can't download its own
// chrome-headless-shell, so reuse one already present on the machine.
// Note: the *headless_shell* binary is required — the full Chrome binary
// removed the old headless mode that Remotion relies on.
const resolveBrowserExecutable = (): string | null => {
  const fromEnv = process.env.REMOTION_BROWSER_EXECUTABLE;
  if (fromEnv && existsSync(fromEnv)) {
    return fromEnv;
  }

  // Playwright-style install (e.g. /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell)
  const pwRoot = "/opt/pw-browsers";
  if (existsSync(pwRoot)) {
    const dir = readdirSync(pwRoot).find((d) =>
      d.startsWith("chromium_headless_shell"),
    );
    if (dir) {
      const candidate = join(pwRoot, dir, "chrome-linux", "headless_shell");
      if (existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return null;
};

const browserExecutable = resolveBrowserExecutable();
if (browserExecutable) {
  Config.setBrowserExecutable(browserExecutable);
}
