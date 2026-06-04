import { readFile } from "node:fs/promises";
import { join } from "node:path";

const projectRoot = new URL("..", import.meta.url).pathname;
const env = await loadEnv(join(projectRoot, ".env.local"));

const clickupClients = [
  ["ALGELO", "901516105496"],
  ["AMINTA", "901512094155"],
  ["ARTEMA", "901512094157"],
  ["BELLAVISTA", "901516105507"],
  ["BELVEDERE", "901512094191"],
  ["BUFALE", "901512094166"],
  ["CASA50", "901512094206"],
  ["CITY STONE", "901512094203"],
  ["COSTIERA GIN", "901516105511"],
  ["DAFNE", "901512094169"],
  ["EUROPA PALACE", "901512094198"],
  ["FAVORITA", "901516105505"],
  ["FUCINA FLEGREA", "901512094201"],
  ["LDM", "901516105503"],
  ["LUNA DI MIELE", "901512094196"],
  ["MAISON DEL MARE", "901516105514"],
  ["MORFEO", "901516105512"],
  ["PIEMME", "901516105510"],
  ["PIZZAINGRAMMI", "901512094182"],
  ["QUICKASA", "901512094179"],
  ["RADI", "901516105508"],
  ["SCALZONE", "901512094177"],
  ["TABERNA SCIOPA", "901512094175"],
  ["VAN BOL", "901516105502"],
  ["VETERA", "901512094204"],
  ["ZEST", "901512094167"]
];

if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const existingResponse = await supabaseFetch("/clients?select=name");
if (!existingResponse.ok) {
  throw new Error(`Could not read existing clients: ${existingResponse.status} ${await existingResponse.text()}`);
}

const existing = new Set((await existingResponse.json()).map((client) => normalizeName(client.name)));
const payload = clickupClients
  .filter(([name]) => !existing.has(normalizeName(name)))
  .map(([name, folderId]) => ({
    name,
    status: "attivo",
    services: [],
    clickup_url: `https://app.clickup.com/f/${folderId}`,
    drive_url: null,
    notes: `Importato da ClickUp CLIENTI. Folder ID: ${folderId}`
  }));

if (!payload.length) {
  console.log("No new ClickUp clients to seed.");
  process.exit(0);
}

const insertResponse = await supabaseFetch("/clients", {
  method: "POST",
  headers: { Prefer: "return=minimal" },
  body: JSON.stringify(payload)
});

if (!insertResponse.ok) {
  throw new Error(`Client seed failed: ${insertResponse.status} ${await insertResponse.text()}`);
}

console.log(`Seeded ${payload.length} ClickUp clients.`);

function normalizeName(name) {
  return String(name || "").trim().toLowerCase();
}

async function supabaseFetch(path, options = {}) {
  return fetch(`${env.SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
}

async function loadEnv(path) {
  const file = await readFile(path, "utf8");
  return Object.fromEntries(file.split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => {
    const index = line.indexOf("=");
    return [line.slice(0, index), line.slice(index + 1)];
  }));
}
