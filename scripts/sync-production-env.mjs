/**
 * Sync production env vars to Vercel (API + Web) and GitHub Actions secrets.
 *
 * Usage:
 *   node scripts/init-production-env.mjs
 *   # add VERCEL_TOKEN to .env.production
 *   node scripts/sync-production-env.mjs
 *   node scripts/sync-production-env.mjs --all-environments
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const productionEnvPath = path.join(rootDir, ".env.production");

if (!fs.existsSync(productionEnvPath)) {
  console.error("Missing .env.production. Run: node scripts/init-production-env.mjs");
  process.exit(1);
}

const extraArgs = process.argv.slice(2).filter((arg) => arg !== "--production");
const nodeArgs = ["scripts/sync-vercel-env.mjs", "--env-file=.env.production", ...extraArgs];

console.log("Syncing app env vars to Vercel...");
const vercelResult = spawnSync(process.execPath, nodeArgs, {
  cwd: rootDir,
  stdio: "inherit",
  env: process.env
});

if (vercelResult.status !== 0) {
  process.exit(vercelResult.status ?? 1);
}

console.log("\nSyncing deploy secrets to GitHub...");
const githubResult = spawnSync(
  process.execPath,
  ["scripts/sync-github-secrets.mjs", "--env-file=.env.production"],
  {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env
  }
);

if (githubResult.status !== 0) {
  process.exit(githubResult.status ?? 1);
}

console.log("\nProduction env sync complete.");
console.log("Redeploy API and Web on Vercel for runtime changes to take effect.");
