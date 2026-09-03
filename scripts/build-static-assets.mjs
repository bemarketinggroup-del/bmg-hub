import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { transform } from "esbuild";

const publicDir = path.resolve("public");
const outputDir = path.resolve("dist");
const assetsDir = path.join(outputDir, "assets");
const compiled = new Map();
const sourceAssets = [
  ["styles.css", "css"],
  ["app.js", "js"],
  ["primeng-adapter.js", "js"],
  ["ped-gallery-metadata.js", "js"],
  ["ped-share.css", "css"],
  ["ped-share.js", "js"]
];

await rm(outputDir, { recursive: true, force: true });
await mkdir(assetsDir, { recursive: true });

for (const [name, loader] of sourceAssets) {
  const source = await readFile(path.join(publicDir, name), "utf8");
  const result = await transform(source, {
    loader,
    minify: true,
    legalComments: "none",
    target: loader === "js" ? ["es2020", "safari14"] : undefined
  });
  const hash = createHash("sha256").update(result.code).digest("hex").slice(0, 12);
  const extension = path.extname(name);
  const stem = path.basename(name, extension);
  const outputName = `${stem}.${hash}${extension}`;
  await writeFile(path.join(assetsDir, outputName), result.code);
  compiled.set(name, `/assets/${outputName}`);
}

for (const entry of await readdir(publicDir, { withFileTypes: true })) {
  if (compiled.has(entry.name) || entry.name.endsWith(".html")) continue;
  await cp(path.join(publicDir, entry.name), path.join(outputDir, entry.name), { recursive: true });
}

function assetUrl(name) {
  const value = compiled.get(name);
  if (!value) throw new Error(`Asset non compilato: ${name}`);
  return value;
}

async function emitHtml(name) {
  let html = await readFile(path.join(publicDir, name), "utf8");
  for (const [sourceName] of sourceAssets) {
    html = html
      .replaceAll(`href="/${sourceName}"`, `href="${assetUrl(sourceName)}"`)
      .replaceAll(`href="${sourceName}"`, `href="${assetUrl(sourceName)}"`)
      .replaceAll(`src="/${sourceName}"`, `src="${assetUrl(sourceName)}"`)
      .replaceAll(`src="${sourceName}"`, `src="${assetUrl(sourceName)}"`);
  }
  await writeFile(path.join(outputDir, name), html);
}

for (const entry of await readdir(publicDir, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith(".html")) await emitHtml(entry.name);
}

await writeFile(path.join(outputDir, "asset-manifest.json"), JSON.stringify(Object.fromEntries(compiled), null, 2));
console.log(`Build statico completato: ${compiled.size} asset versionati in dist/assets.`);
