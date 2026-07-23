import assert from "node:assert/strict";
import {
  findClientLibraryFolder,
  normalizeDriveLibraryName,
  resolveClientDriveLibraries
} from "../lib/client-drive-libraries.js";

const folder = (id, name) => ({ id, name, mimeType: "application/vnd.google-apps.folder" });
const files = [
  folder("1", "ARTEMA"),
  folder("2", "CITYSTONE"),
  folder("3", "MACELLERIA BELVEDERE"),
  { id: "4", name: "BELVEDERE", mimeType: "image/jpeg" }
];

assert.equal(normalizeDriveLibraryName("Casa 50 Roma"), "CASA50ROMA");
assert.equal(findClientLibraryFolder(files, "ARTEMA")?.id, "1");
assert.equal(findClientLibraryFolder(files, "CITY STONE")?.id, "2");
assert.equal(findClientLibraryFolder(files, "BELVEDERE")?.id, "3");
assert.equal(findClientLibraryFolder(files, "CLIENTE ASSENTE"), null);

const libraries = await resolveClientDriveLibraries("ARTEMA", async () => files);
assert.deepEqual(libraries.map((item) => item.source), ["graphics", "video"]);
assert.ok(libraries.every((item) => item.id === "1"));

let refreshCalls = 0;
const refreshedLibraries = await resolveClientDriveLibraries("ARTEMA", async (_rootId, options = {}) => {
  refreshCalls += 1;
  return options.fresh ? files : [];
});
assert.equal(refreshCalls, 4, "ogni raccolta mancante deve essere riletta senza cache una sola volta");
assert.deepEqual(refreshedLibraries.map((item) => item.source), ["graphics", "video"]);

console.log("Client Drive library tests passed");
