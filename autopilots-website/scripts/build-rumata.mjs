import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const commit = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: root,
  encoding: "utf8",
}).trim();
if (!/^[a-f0-9]{40}$/.test(commit))
  throw new Error("Immutable release identity required");
const env = {
  ...process.env,
  PUBLIC_SITE_URL: "https://www.auto-pilots.io",
  AUTOPILOTS_RELEASE_SHA: commit,
  AUTOPILOTS_RELEASE_RUN_ID:
    process.env.AUTOPILOTS_RELEASE_RUN_ID || `rumata-${commit.slice(0, 12)}`,
  CONTEXT: "rumata-production",
};
if (env.NETLIFY)
  throw new Error("Rumata publication cannot use a Netlify build context");
const run = (command, args) =>
  execFileSync(command, args, { cwd: root, env, stdio: "inherit" });
for (const script of ["format:check", "lint", "typecheck"])
  run("corepack", ["pnpm", "run", script]);
run(process.execPath, [
  "--test",
  ...readdirSync(resolve(root, "tests/unit"))
    .filter((name) => name.endsWith(".test.mjs"))
    .map((name) => `tests/unit/${name}`),
]);
run("corepack", ["pnpm", "run", "build"]);
const robots = resolve(root, "dist/robots.txt");
writeFileSync(
  robots,
  readFileSync(robots, "utf8").replace(
    /^Sitemap:.*$/m,
    "Sitemap: https://www.auto-pilots.io/sitemap.xml",
  ),
);
for (const script of ["release:verify", "test", "test:release"])
  run("corepack", ["pnpm", "run", script]);
console.log(
  `Verified Rumata artifact for https://www.auto-pilots.io at ${commit}`,
);
