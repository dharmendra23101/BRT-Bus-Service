/**
 * Releases emulator ports left held by a previous run.
 *
 * On Windows the Firestore and Database emulators are JVMs that do not exit
 * on the SIGINT `firebase emulators:exec` sends them, so a run that reports a
 * clean shutdown can still leave `java.exe` listening. The next run then dies
 * with "Could not start Firestore Emulator, port taken" and the rules gate is
 * unusable until somebody kills them by hand.
 *
 * This is deliberately narrow. It reads the ports out of `firebase.json`,
 * and for each one it kills a process ONLY if that process is a `java.exe`
 * whose command line runs a Firebase emulator jar. Anything else listening on
 * those ports is reported and left alone - a script that frees a port by
 * killing whatever it finds there is a script that will eventually kill
 * something that mattered.
 *
 * A no-op everywhere except Windows, where the problem is.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

if (process.platform !== "win32") process.exit(0);

const ports = (() => {
  const config = JSON.parse(readFileSync("firebase.json", "utf8"));

  return Object.values(config.emulators ?? {})
    .map((entry) => entry?.port)
    .filter((port) => typeof port === "number");
})();

const run = (file, args) => {
  try {
    return execFileSync(file, args, { encoding: "utf8" });
  } catch {
    return "";
  }
};

/** PIDs listening on any emulator port. */
const listeners = new Set(
  run("netstat", ["-ano"])
    .split("\n")
    .filter((line) => line.includes("LISTENING"))
    .flatMap((line) => {
      const columns = line.trim().split(/\s+/);
      const local = columns[1] ?? "";
      const pid = Number(columns.at(-1));
      const port = Number(local.slice(local.lastIndexOf(":") + 1));

      return ports.includes(port) && Number.isInteger(pid) && pid > 0
        ? [pid]
        : [];
    })
);

if (listeners.size === 0) process.exit(0);

for (const pid of listeners) {
  const description = run("powershell", [
    "-NoProfile",
    "-Command",
    `(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`,
  ]).trim();

  const isEmulator =
    /java\.exe/i.test(description) && /firebase[\\/]emulators/i.test(description);

  if (!isEmulator) {
    console.warn(
      `port held by pid ${pid}, which is not a Firebase emulator - leaving it alone`
    );
    continue;
  }

  run("taskkill", ["/PID", String(pid), "/F"]);
  console.log(`released emulator port held by pid ${pid}`);
}
