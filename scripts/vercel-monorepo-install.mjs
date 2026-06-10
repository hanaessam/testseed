import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");

if (process.env.CI === "true" && existsSync(join(rootDir, "node_modules"))) {
  console.log("CI: dependencies already installed — skipping npm ci.");
  process.exit(0);
}

execSync("npm ci", {
  cwd: rootDir,
  stdio: "inherit",
  shell: true,
  env: process.env
});
