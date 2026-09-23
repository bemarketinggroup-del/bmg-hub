import assert from "node:assert/strict";
import { buildClientAffinities, selectRelevantClientHealth } from "../lib/client-affinity.js";

const clients = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Bellevue Syrene" },
  { id: "22222222-2222-4222-8222-222222222222", name: "Vetera" },
  { id: "33333333-3333-4333-8333-333333333333", name: "Artema" }
];
const now = new Date("2026-09-23T10:00:00.000Z");
const affinities = buildClientAffinities({
  clients,
  now,
  actions: [
    { action_key: "view_ped", client_id: clients[2].id, created_at: "2026-09-23T09:00:00.000Z" },
    { action_key: "create_ped_content", client_id: clients[0].id, created_at: "2026-09-22T10:00:00.000Z" },
    { action_key: "update_ped_content", client_id: clients[0].id, created_at: "2026-09-20T10:00:00.000Z" },
    { action_key: "update_ped_note", context_label: "Vetera · PED settembre 2026", created_at: "2026-07-20T10:00:00.000Z" },
    { action_key: "create_ped_content", client_id: clients[2].id, created_at: "2026-01-01T10:00:00.000Z" }
  ]
});

assert.deepEqual(affinities.map((entry) => entry.client_name), ["Bellevue Syrene", "Vetera"], "visite e attivita obsolete non devono creare associazioni cliente");
assert.equal(affinities[0].activity_count, 2, "le modifiche recenti sullo stesso PED devono consolidare l'associazione");
assert.equal(affinities[0].confidence, "alta");
assert.equal(affinities[1].source, "ped_activity");

const health = clients.map((client, index) => ({ client_id: client.id, client_name: client.name, overall_score: 20 + index * 20 }));
assert.deepEqual(
  selectRelevantClientHealth({ health, affinities, profileRole: "staff" }).map((entry) => entry.client_name),
  ["Bellevue Syrene", "Vetera"],
  "lo staff deve ricevere analisi per i clienti ricavati dal proprio lavoro PED"
);
assert.equal(selectRelevantClientHealth({ health, affinities, profileRole: "admin" }).length, 3, "l'amministratore deve mantenere la visione completa");
assert.equal(selectRelevantClientHealth({ health, affinities: [], profileRole: "staff" }).length, 0, "senza storico lo staff non deve ricevere analisi di clienti non pertinenti");
assert.ok(selectRelevantClientHealth({ health, affinities: [affinities[0]], profileRole: "staff", focusedClientId: clients[2].id }).some((entry) => entry.client_name === "Artema"), "il cliente aperto deve restare analizzabile anche fuori dallo storico personale");

console.log("Client affinity checks passed.");
