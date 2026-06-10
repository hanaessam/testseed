import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const projectDir = process.argv[2];
const vercelConfigDir = process.argv[3] ?? projectDir;

if (!projectDir) {
  console.error(
    "Usage: node scripts/vercel-fix-project-json.mjs <project-dir> [vercel-config-dir]"
  );
  process.exit(1);
}

const projectFile = join(rootDir, projectDir, ".vercel", "project.json");
const vercelConfigFile = join(rootDir, vercelConfigDir, "vercel.json");

if (!existsSync(projectFile)) {
  console.log(`No ${projectFile} — skipping Vercel project.json fix.`);
  process.exit(0);
}

const project = JSON.parse(readFileSync(projectFile, "utf8"));
const vercelConfig = existsSync(vercelConfigFile)
  ? JSON.parse(readFileSync(vercelConfigFile, "utf8"))
  : {};

if (!project.settings) {
  project.settings = {};
}

const changes = [];

if (vercelConfig.installCommand) {
  project.settings.installCommand = vercelConfig.installCommand;
  changes.push(`set installCommand=${vercelConfig.installCommand}`);
}

if (vercelConfig.buildCommand) {
  project.settings.buildCommand = vercelConfig.buildCommand;
  changes.push(`set buildCommand=${vercelConfig.buildCommand}`);
}

if (changes.length === 0) {
  console.log(`${projectFile} already aligned for monorepo CI.`);
  process.exit(0);
}

writeFileSync(projectFile, `${JSON.stringify(project, null, 2)}\n`);
console.log(`Patched ${projectFile}: ${changes.join(", ")}`);
