import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyProductionUrlOverrides, parseEnvFile, resolveEnvFilePath } from "./env-file.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolveEnvFilePath(rootDir);

const apiEnvKeys = [
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
];

const webEnvKeys = [
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_GENERATION_WORKBENCH_STREAMING",
  "NEXT_PUBLIC_GENERATION_WORKBENCH_EXPORT",
  "WEB_APP_URL"
];

/** Keys that were mistakenly synced to both projects — safe to remove from testseed-web. */
const webOnlyMisplacedKeys = [
  "MONGODB_URI",
  "JWT_SECRET",
  "OPENAI_API_KEY",
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
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "GITHUB_CALLBACK_URL"
];

/** Keys that do not belong on the API project. */
const apiMisplacedKeys = [
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_GENERATION_WORKBENCH_STREAMING",
  "NEXT_PUBLIC_GENERATION_WORKBENCH_EXPORT"
];

const vercelCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const environments = process.argv.includes("--all-environments")
  ? ["production", "preview", "development"]
  : ["production"];
const envValues = parseEnvFile(envPath);

applyProductionUrlOverrides(envValues);

if (process.argv.includes("--prune-misplaced")) {
  removeMisplacedEnv("apps/web", webOnlyMisplacedKeys);
  removeMisplacedEnv("apps/api", apiMisplacedKeys);
}

syncProjectEnv("apps/api", apiEnvKeys, envValues);
syncProjectEnv("apps/web", webEnvKeys, envValues);

console.log(`Synced environment variables to Vercel projects from ${path.basename(envPath)}.`);

function readLinkedProjectEnv(projectDir) {
  const projectFile = path.join(rootDir, projectDir, ".vercel", "project.json");

  if (!fs.existsSync(projectFile)) {
    return {};
  }

  const project = JSON.parse(fs.readFileSync(projectFile, "utf8"));

  return {
    VERCEL_ORG_ID: project.orgId ?? process.env.VERCEL_ORG_ID,
    VERCEL_PROJECT_ID: project.projectId ?? process.env.VERCEL_PROJECT_ID
  };
}

function getVercelScopeFlag(projectDir) {
  const scope = process.env.VERCEL_SCOPE ?? process.env.VERCEL_TEAM_SLUG;

  if (scope) {
    return ` --scope ${scope}`;
  }

  const projectFile = path.join(rootDir, projectDir, ".vercel", "project.json");

  if (fs.existsSync(projectFile)) {
    return "";
  }

  throw new Error(
    `Link ${projectDir} with "vercel link" or set VERCEL_SCOPE / VERCEL_TEAM_SLUG before syncing env vars.`
  );
}

function removeMisplacedEnv(projectDir, keys) {
  const cwd = path.join(rootDir, projectDir);
  const scopeFlag = getVercelScopeFlag(projectDir);

  for (const key of keys) {
    try {
      execSync(`${vercelCommand} vercel env rm ${key} production --yes${scopeFlag}`, {
        cwd,
        stdio: "inherit",
        shell: true,
        env: {
          ...process.env,
          ...readLinkedProjectEnv(projectDir)
        }
      });
      execSync(`${vercelCommand} vercel env rm ${key} preview --yes${scopeFlag}`, {
        cwd,
        stdio: "inherit",
        shell: true,
        env: {
          ...process.env,
          ...readLinkedProjectEnv(projectDir)
        }
      });
      console.log(`Removed misplaced ${key} from ${projectDir}`);
    } catch {
      console.warn(`Could not remove ${key} from ${projectDir} (may not exist).`);
    }
  }
}

function syncProjectEnv(projectDir, keys, values) {
  const cwd = path.join(rootDir, projectDir);

  for (const key of keys) {
    const value = values[key];

    if (value === undefined || value === "") {
      console.warn(`Skipping ${key} for ${projectDir}: no value in ${path.basename(envPath)}`);
      continue;
    }

    for (const environment of environments) {
      const scopeFlag = getVercelScopeFlag(projectDir);

      execSync(
        `${vercelCommand} vercel env add ${key} ${environment} --yes --force${scopeFlag}`,
        {
          cwd,
          input: value,
          stdio: ["pipe", "ignore", "inherit"],
          shell: true,
          env: {
            ...process.env,
            ...readLinkedProjectEnv(projectDir)
          }
        }
      );
    }
  }
}
