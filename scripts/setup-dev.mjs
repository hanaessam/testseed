import { existsSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const envPath = resolve(root, ".env");
const envExamplePath = resolve(root, ".env.example");

run("npm", ["install"]);

if (!existsSync(envPath)) {
  copyFileSync(envExamplePath, envPath);
  console.log("Created .env from .env.example. Fill in local secrets before starting the app.");
} else {
  console.log(".env already exists; leaving it unchanged.");
}

console.log("");
console.log("Development setup is ready.");
console.log("Run `npm run dev` for local hot reload.");
console.log("Run `npm run dev:docker` for Docker Compose hot reload.");

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    shell: process.platform === "win32",
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
