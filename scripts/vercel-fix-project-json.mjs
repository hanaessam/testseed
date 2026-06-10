import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const appDir = process.argv[2];

if (!appDir) {
  console.error("Usage: node scripts/vercel-fix-project-json.mjs <app-dir>");
  process.exit(1);
}

const projectFile = join(appDir, ".vercel", "project.json");

if (!existsSync(projectFile)) {
  console.log(`No ${projectFile} — skipping rootDirectory fix.`);
  process.exit(0);
}

const project = JSON.parse(readFileSync(projectFile, "utf8"));

if (!project.rootDirectory) {
  console.log(`${projectFile} has no rootDirectory — nothing to fix.`);
  process.exit(0);
}

console.log(
  `Removing rootDirectory "${project.rootDirectory}" from ${projectFile} (avoids doubled paths with --cwd in CI).`
);

delete project.rootDirectory;
writeFileSync(projectFile, `${JSON.stringify(project, null, 2)}\n`);
