import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webAppDir = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(webAppDir, "../..", ".env");

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: readRootPublicEnv(rootEnvPath)
};

function readRootPublicEnv(envPath) {
  if (!fs.existsSync(envPath)) {
    return {};
  }

  const publicEnv = {};
  const envContent = fs.readFileSync(envPath, "utf8");

  for (const line of envContent.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?(NEXT_PUBLIC_[A-Z0-9_]+)\s*=\s*(.*)?\s*$/);

    if (!match) {
      continue;
    }

    const [, key, rawValue = ""] = match;
    publicEnv[key] = normalizeEnvValue(rawValue);
  }

  return publicEnv;
}

function normalizeEnvValue(rawValue) {
  const value = rawValue.trim();
  const quote = value[0];

  if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
    return value.slice(1, -1);
  }

  return value.replace(/\s+#.*$/, "");
}

export default nextConfig;
