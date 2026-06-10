import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = process.argv[2];

if (!appDir) {
  console.error("Usage: node scripts/vercel-fix-project-json.mjs <app-dir>");
  process.exit(1);
}

const projectFile = join(appDir, ".vercel", "project.json");
const vercelConfigFile = join(appDir, "vercel.json");

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

if (project.rootDirectory) {
  delete project.rootDirectory;
  changes.push("removed top-level rootDirectory");
}

if (project.settings.rootDirectory) {
  delete project.settings.rootDirectory;
  changes.push("removed settings.rootDirectory");
}

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
