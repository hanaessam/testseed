import fs from "node:fs";
import path from "node:path";

export const PRODUCTION_URL_DEFAULTS = {
  WEB_APP_URL: "https://testseed-web.vercel.app",
  NEXT_PUBLIC_API_URL: "https://testseed-api.vercel.app",
  GITHUB_CALLBACK_URL: "https://testseed-api.vercel.app/auth/github/callback"
};

export const DEPLOY_ONLY_ENV_KEYS = new Set([
  "VERCEL_TOKEN",
  "VERCEL_ORG_ID",
  "VERCEL_WEB_PROJECT_ID",
  "VERCEL_API_PROJECT_ID",
  "VERCEL_WEB_URL",
  "VERCEL_API_URL",
  "VERCEL_SCOPE",
  "VERCEL_TEAM_SLUG"
]);

export function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${filePath}.`);
  }

  const values = {};

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = trimmed.match(/^(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/);

    if (!match) {
      continue;
    }

    const [, key, rawValue = ""] = match;
    values[key] = normalizeEnvValue(rawValue);
  }

  return values;
}

export function normalizeEnvValue(rawValue) {
  const value = rawValue.trim();
  const quote = value[0];

  if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
    return value.slice(1, -1);
  }

  return value.replace(/\s+#.*$/, "");
}

export function applyProductionUrlOverrides(values) {
  const webUrl = values.VERCEL_WEB_URL ?? process.env.VERCEL_WEB_URL;
  const apiUrl = values.VERCEL_API_URL ?? process.env.VERCEL_API_URL;

  if (webUrl) {
    values.WEB_APP_URL = webUrl.replace(/\/$/, "");
  }

  if (apiUrl) {
    const normalizedApiUrl = apiUrl.replace(/\/$/, "");
    values.NEXT_PUBLIC_API_URL = normalizedApiUrl;
    values.GITHUB_CALLBACK_URL = `${normalizedApiUrl}/auth/github/callback`;
  }
}

export function readLinkedVercelIds(rootDir) {
  const ids = {};

  const apiProjectFile = path.join(rootDir, "apps/api/.vercel/project.json");
  const webProjectFile = path.join(rootDir, "apps/web/.vercel/project.json");

  if (fs.existsSync(apiProjectFile)) {
    const apiProject = JSON.parse(fs.readFileSync(apiProjectFile, "utf8"));
    ids.VERCEL_ORG_ID = apiProject.orgId;
    ids.VERCEL_API_PROJECT_ID = apiProject.projectId;
  }

  if (fs.existsSync(webProjectFile)) {
    const webProject = JSON.parse(fs.readFileSync(webProjectFile, "utf8"));
    ids.VERCEL_ORG_ID = ids.VERCEL_ORG_ID ?? webProject.orgId;
    ids.VERCEL_WEB_PROJECT_ID = webProject.projectId;
  }

  return ids;
}

export function serializeEnvFile(values, orderedKeys) {
  const lines = [
    "# Generated for production deploy sync. Do not commit.",
    ""
  ];

  for (const key of orderedKeys) {
    const value = values[key];

    if (value === undefined || value === "") {
      continue;
    }

    lines.push(formatEnvLine(key, value));
  }

  lines.push("");
  return `${lines.join("\n")}`;
}

function formatEnvLine(key, value) {
  if (/[\s#"'\\]/.test(value)) {
    return `${key}="${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }

  return `${key}=${value}`;
}

export function resolveEnvFilePath(rootDir, argv = process.argv) {
  const envFileArg = argv.find((arg) => arg.startsWith("--env-file="));

  if (envFileArg) {
    const relativePath = envFileArg.slice("--env-file=".length);
    return path.isAbsolute(relativePath) ? relativePath : path.join(rootDir, relativePath);
  }

  if (argv.includes("--production")) {
    return path.join(rootDir, ".env.production");
  }

  return path.join(rootDir, ".env");
}
