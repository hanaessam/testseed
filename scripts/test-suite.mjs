import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const turboArgs = args.length > 0 ? args : ["build", "lint", "test"];
const command = process.platform === "win32" ? "npx.cmd" : "npx";

const result = spawnSync(command, ["turbo", ...turboArgs], {
  stdio: "inherit",
  shell: process.platform === "win32"
});

if (result.error) {
  console.error(result.error.message);
}

process.exit(result.status ?? 1);
