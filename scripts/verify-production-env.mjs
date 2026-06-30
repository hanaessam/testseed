/**
 * Compare .env.production URL settings with Vercel project env presence,
 * API health, OAuth callback wiring, and the deployed web client bundle.
 *
 * Usage: node scripts/verify-production-env.mjs
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnvFile } from "./env-file.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const productionEnvPath = path.join(rootDir, ".env.production");
const vercelCommand = process.platform === "win32" ? "npx.cmd" : "npx";

if (!fs.existsSync(productionEnvPath)) {
  console.error("Missing .env.production. Run: npm run env:production:init");
  process.exit(1);
}

const expected = parseEnvFile(productionEnvPath);

const checks = [
  {
    label: "Web app URL",
    key: "WEB_APP_URL",
    expected: expected.WEB_APP_URL,
    projects: ["apps/api", "apps/web"]
  },
  {
    label: "Public API URL (web)",
    key: "NEXT_PUBLIC_API_URL",
    expected: expected.NEXT_PUBLIC_API_URL,
    projects: ["apps/web"]
  },
  {
    label: "GitHub callback (API)",
    key: "GITHUB_CALLBACK_URL",
    expected: expected.GITHUB_CALLBACK_URL,
    projects: ["apps/api"]
  },
  {
    label: "GitHub client ID (API)",
    key: "GITHUB_CLIENT_ID",
    expected: expected.GITHUB_CLIENT_ID ? "(set)" : "(missing)",
    projects: ["apps/api"]
  }
];

console.log("Production URL expectations from .env.production:\n");

for (const check of checks) {
  console.log(`  ${check.label}: ${check.expected ?? "(missing)"}`);
}

console.log("\nVercel production env var presence:\n");

for (const projectDir of ["apps/api", "apps/web"]) {
  const names = listEnvNames(projectDir);
  console.log(`  ${projectDir}: ${names.length ? names.join(", ") : "(none)"}`);

  for (const check of checks) {
    if (!check.projects.includes(projectDir)) {
      continue;
    }

    const present = names.includes(check.key);
    const localValue = expected[check.key];
    const status = present && localValue ? "OK" : present ? "present, check value in Vercel dashboard" : "MISSING";
    console.log(`    - ${check.key}: ${status}`);
  }
}

console.log("\nRuntime checks:\n");

const apiUrl = (expected.NEXT_PUBLIC_API_URL ?? "https://testseed-api.vercel.app").replace(/\/$/, "");
const webUrl = (expected.WEB_APP_URL ?? "https://testseed-web.vercel.app").replace(/\/$/, "");

try {
  const healthResponse = await fetch(`${apiUrl}/health`);
  console.log(`  GET ${apiUrl}/health -> ${healthResponse.status}`);

  if (!healthResponse.ok) {
    console.log("    API is not healthy. OAuth cannot work until the API starts.");
    console.log("    Redeploy testseed-api after merging the workspace dist fix.");
    process.exit(1);
  }

  const oauthResponse = await fetch(`${apiUrl}/auth/github`, { redirect: "manual" });
  const location = oauthResponse.headers.get("location");

  console.log(`  GET ${apiUrl}/auth/github -> ${oauthResponse.status}`);

  if (!location) {
    console.log("    No redirect Location header. Check API logs and GITHUB_* env vars.");
    process.exit(1);
  }

  const githubUrl = new URL(location);
  const redirectUri = githubUrl.searchParams.get("redirect_uri");
  const clientId = githubUrl.searchParams.get("client_id");

  console.log(`    client_id: ${clientId}`);
  console.log(`    redirect_uri: ${redirectUri}`);

  if (redirectUri === expected.GITHUB_CALLBACK_URL) {
    console.log("    redirect_uri matches .env.production");
  } else {
    console.log(`    EXPECTED redirect_uri: ${expected.GITHUB_CALLBACK_URL}`);
    console.log("    Mismatch: redeploy API after env sync, or fix GITHUB_CALLBACK_URL on Vercel.");
  }

  if (clientId && clientId !== expected.GITHUB_CLIENT_ID) {
    console.log("    client_id does not match .env.production GITHUB_CLIENT_ID");
    console.log("    Ensure production OAuth app credentials are on the API Vercel project.");
  }

  await verifyWebBundleApiUrl(webUrl, apiUrl);
} catch (error) {
  console.log(`    Production runtime check failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

async function verifyWebBundleApiUrl(webUrl, apiUrl) {
  const loginUrl = `${webUrl}/login`;
  const loginResponse = await fetch(loginUrl);

  console.log(`  GET ${loginUrl} -> ${loginResponse.status}`);

  if (!loginResponse.ok) {
    console.log("    Could not load the production login page.");
    process.exit(1);
  }

  const html = await loginResponse.text();
  const chunkUrls = [...html.matchAll(/(?:src|href)="([^"]+\.js)"/g)]
    .map((match) => new URL(match[1], webUrl).toString());

  const apiClientChunks = [];

  for (const chunkUrl of [...new Set(chunkUrls)]) {
    const chunkResponse = await fetch(chunkUrl);

    if (!chunkResponse.ok) {
      continue;
    }

    const chunk = await chunkResponse.text();

    if (chunk.includes("/auth/login") || chunk.includes("NEXT_PUBLIC_API_URL")) {
      apiClientChunks.push({ chunkUrl, chunk });
    }
  }

  if (apiClientChunks.length === 0) {
    console.log("    Could not find the deployed API client chunk for /login.");
    process.exit(1);
  }

  for (const { chunkUrl, chunk } of apiClientChunks) {
    const path = new URL(chunkUrl).pathname;

    if (chunk.includes("http://localhost:3001")) {
      console.log(`    ${path} still contains http://localhost:3001.`);
      console.log("    Redeploy testseed-web after env sync and confirm next.config.js lets Vercel env override root .env.");
      process.exit(1);
    }

    if (chunk.includes(apiUrl)) {
      console.log(`    ${path} uses ${apiUrl}`);
      return;
    }
  }

  console.log(`    The /login API client chunk did not include expected API URL: ${apiUrl}`);
  console.log("    Redeploy testseed-web after env sync, then run this verifier again.");
  process.exit(1);
}

function listEnvNames(projectDir) {
  const projectFile = path.join(rootDir, projectDir, ".vercel", "project.json");

  if (!fs.existsSync(projectFile)) {
    return [];
  }

  const project = JSON.parse(fs.readFileSync(projectFile, "utf8"));
  const cwd = path.join(rootDir, projectDir);

  try {
    const output = execSync(`${vercelCommand} vercel env ls production`, {
      cwd,
      encoding: "utf8",
      shell: true,
      stdio: ["pipe", "pipe", "inherit"],
      env: {
        ...process.env,
        VERCEL_ORG_ID: project.orgId,
        VERCEL_PROJECT_ID: project.projectId
      }
    });

    return [...output.matchAll(/^\s+([A-Z0-9_]+)\s+/gm)].map((match) => match[1]);
  } catch {
    return [];
  }
}
