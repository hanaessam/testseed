/**
 * Print which env vars exist on each linked Vercel project (names only).
 * Usage: node scripts/audit-vercel-env.mjs
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vercelCommand = process.platform === "win32" ? "npx.cmd" : "npx";

function readProjectEnv(projectDir) {
  const projectFile = path.join(rootDir, projectDir, ".vercel", "project.json");

  if (!fs.existsSync(projectFile)) {
    return {};
  }

  const project = JSON.parse(fs.readFileSync(projectFile, "utf8"));

  return {
    VERCEL_ORG_ID: project.orgId,
    VERCEL_PROJECT_ID: project.projectId
  };
}

for (const projectDir of ["apps/api", "apps/web"]) {
  const cwd = path.join(rootDir, projectDir);
  console.log(`\n=== ${projectDir} (production) ===`);

  try {
    const output = execSync(`${vercelCommand} vercel env ls production`, {
      cwd,
      encoding: "utf8",
      shell: true,
      stdio: ["pipe", "pipe", "inherit"],
      env: {
        ...process.env,
        ...readProjectEnv(projectDir)
      }
    });

    const names = [...output.matchAll(/^\s+([A-Z0-9_]+)\s+/gm)].map((match) => match[1]);
    console.log(names.length ? names.join(", ") : "(none)");
  } catch {
    console.log("Could not list env vars — link the project with: vercel link");
  }
}

const apiExpected = new Set([
  "OPENAI_API_KEY",
  "MONGODB_URI",
  "JWT_SECRET",
  "REDIS_URL",
  "REDIS_TOKEN",
  "OTP_TTL_SECONDS",
  "OTP_MAX_ATTEMPTS",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "WEB_APP_URL",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "GITHUB_CALLBACK_URL"
]);

const webExpected = new Set([
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_GENERATION_WORKBENCH_STREAMING",
  "NEXT_PUBLIC_GENERATION_WORKBENCH_EXPORT",
  "WEB_APP_URL"
]);

console.log("\n=== Expected split ===");
console.log("API only:", [...apiExpected].join(", "));
console.log("Web only:", [...webExpected].join(", "));
