import { readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const roots = ["api", "lib", "public", "scripts"];
const ignored = new Set(["scripts/check-syntax.mjs"]);
const files = [];

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(relative);
    else if (/\.(?:js|mjs)$/.test(entry.name) && !ignored.has(relative)) files.push(relative);
  }
}

for (const root of roots) await collect(root);

for (const file of files.sort()) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--check", file], { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`Syntax check fallito: ${file}`)));
  });
}

console.log(`Syntax check completato: ${files.length} file.`);
