/**
 * Create or refresh .env.production from .env plus production URLs and linked Vercel IDs.
 *
 * Usage:
 *   node scripts/init-production-env.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PRODUCTION_URL_DEFAULTS,
  parseEnvFile,
  readLinkedVercelIds,
  serializeEnvFile
} from "./env-file.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceEnvPath = path.join(rootDir, ".env");
const productionEnvPath = path.join(rootDir, ".env.production");

if (!fs.existsSync(sourceEnvPath)) {
  console.error("Missing .env. Run npm run setup:dev and fill local secrets first.");
  process.exit(1);
}

const sourceValues = parseEnvFile(sourceEnvPath);
const linkedVercelIds = readLinkedVercelIds(rootDir);

const productionValues = {
  ...sourceValues,
  ...PRODUCTION_URL_DEFAULTS,
  ...linkedVercelIds
};

if (fs.existsSync(productionEnvPath)) {
  const existingValues = parseEnvFile(productionEnvPath);

  if (existingValues.VERCEL_TOKEN) {
    productionValues.VERCEL_TOKEN = existingValues.VERCEL_TOKEN;
  }
}

const orderedKeys = [
  "OPENAI_API_KEY",
  "MONGODB_URI",
  "REDIS_URL",
  "REDIS_TOKEN",
  "JWT_SECRET",
  "OTP_TTL_SECONDS",
  "OTP_MAX_ATTEMPTS",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_GENERATION_WORKBENCH_STREAMING",
  "NEXT_PUBLIC_GENERATION_WORKBENCH_EXPORT",
  "WEB_APP_URL",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "GITHUB_CALLBACK_URL",
  "VERCEL_TOKEN",
  "VERCEL_ORG_ID",
  "VERCEL_WEB_PROJECT_ID",
  "VERCEL_API_PROJECT_ID"
];

fs.writeFileSync(productionEnvPath, serializeEnvFile(productionValues, orderedKeys));
console.log(`Wrote ${productionEnvPath}`);
console.log("Set VERCEL_TOKEN in .env.production if it is missing, then run:");
console.log("  node scripts/sync-production-env.mjs");
