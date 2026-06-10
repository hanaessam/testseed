/**
 * Push deploy secrets from .env.production to GitHub Actions repository secrets.
 *
 * Usage:
 *   node scripts/sync-github-secrets.mjs
 *   node scripts/sync-github-secrets.mjs --env-file=.env.production
 *
 * Requires: gh auth login
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnvFile, resolveEnvFilePath } from "./env-file.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolveEnvFilePath(rootDir);
const envValues = parseEnvFile(envPath);

const githubSecrets = [
  "VERCEL_TOKEN",
  "VERCEL_ORG_ID",
  "VERCEL_WEB_PROJECT_ID",
  "VERCEL_API_PROJECT_ID"
];

try {
  execSync("gh auth status", { stdio: "ignore", shell: true });
} catch {
  console.error("GitHub CLI is not authenticated. Run: gh auth login");
  process.exit(1);
}

let synced = 0;

for (const key of githubSecrets) {
  const value = envValues[key] ?? process.env[key];

  if (!value) {
    console.warn(`Skipping ${key}: no value in ${path.basename(envPath)} or environment`);
    continue;
  }

  execSync(`gh secret set ${key}`, {
    input: value,
    stdio: ["pipe", "inherit", "inherit"],
    shell: true
  });

  console.log(`Set GitHub secret ${key}`);
  synced += 1;
}

if (synced === 0) {
  console.error("No GitHub secrets were synced.");
  process.exit(1);
}

console.log(`Synced ${synced} GitHub repository secrets from ${path.basename(envPath)}.`);
