/**
 * Align production/preview URL env vars across testseed-web and testseed-api.
 *
 * Usage (from repo root):
 *   VERCEL_WEB_URL=https://testseed-web.vercel.app \
 *   VERCEL_API_URL=https://testseed-api.vercel.app \
 *   node scripts/fix-vercel-production-urls.mjs
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vercelCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const environments = ["production"];

const webUrl = normalizeUrl(process.env.VERCEL_WEB_URL ?? "https://testseed-web.vercel.app");
const apiUrl = normalizeUrl(process.env.VERCEL_API_URL ?? "https://testseed-api.vercel.app");
const githubCallbackUrl = `${apiUrl}/auth/github/callback`;

const apiUrlVars = {
  WEB_APP_URL: webUrl,
  GITHUB_CALLBACK_URL: githubCallbackUrl
};

const webUrlVars = {
  WEB_APP_URL: webUrl,
  NEXT_PUBLIC_API_URL: apiUrl
};

console.log("Production URL alignment:");
console.log(`  Web:              ${webUrl}`);
console.log(`  API:              ${apiUrl}`);
console.log(`  GitHub callback:  ${githubCallbackUrl}`);
console.log("");

setVars("apps/api", apiUrlVars);
setVars("apps/web", webUrlVars);

console.log("Done. Redeploy API and Web for changes to take effect.");

function normalizeUrl(value) {
  return value.replace(/\/$/, "");
}

function readLinkedProjectEnv(projectDir) {
  const projectFile = path.join(rootDir, projectDir, ".vercel", "project.json");

  if (!fs.existsSync(projectFile)) {
    throw new Error(`Link ${projectDir} first: cd ${projectDir} && npx vercel link`);
  }

  const project = JSON.parse(fs.readFileSync(projectFile, "utf8"));

  return {
    VERCEL_ORG_ID: project.orgId ?? process.env.VERCEL_ORG_ID,
    VERCEL_PROJECT_ID: project.projectId ?? process.env.VERCEL_PROJECT_ID
  };
}

function setVars(projectDir, vars) {
  const cwd = path.join(rootDir, projectDir);
  const scope = process.env.VERCEL_SCOPE ?? process.env.VERCEL_TEAM_SLUG ?? "";
  const scopeFlag = scope ? ` --scope ${scope}` : "";

  for (const [key, value] of Object.entries(vars)) {
    for (const environment of environments) {
      execSync(`${vercelCommand} vercel env add ${key} ${environment} --yes --force${scopeFlag}`, {
        cwd,
        input: value,
        stdio: ["pipe", "inherit", "inherit"],
        shell: true,
        env: {
          ...process.env,
          ...readLinkedProjectEnv(projectDir)
        }
      });

      console.log(`Set ${key} (${environment}) on ${projectDir}`);
    }
  }
}
