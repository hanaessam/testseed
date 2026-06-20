import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const filter = process.argv[2];

if (!filter) {
  console.error("Usage: node scripts/vercel-monorepo-build.mjs <turbo-filter>");
  process.exit(1);
}

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const markerPath = join(rootDir, ".turbo");

if (process.env.CI === "true" && existsSync(markerPath)) {
  console.log(`CI: turbo build already ran — skipping build for ${filter}.`);
  process.exit(0);
}

execSync(`npx turbo run build --filter=${filter}`, {
  cwd: rootDir,
  stdio: "inherit",
  shell: true,
  env: process.env
});
