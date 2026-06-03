import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const projectRoot = new URL(".", import.meta.url).pathname;
const publicRoot = join(projectRoot, "public");
const env = await loadEnv(join(projectRoot, ".env.local"));
const port = Number(process.env.PORT || 8020);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname === "/api/leads") {
      await handleLeads(request, response);
      return;
    }

    await serveStatic(url.pathname, response);
  } catch (error) {
    response.writeHead(500, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: error.message }));
  }
}).listen(port, () => {
  console.log(`BMG Hub running on http://localhost:${port}`);
});

async function loadEnv(path) {
  const file = await readFile(path, "utf8");
  return Object.fromEntries(file.split(/\r?\n/).filter(Boolean).map((line) => {
    const index = line.indexOf("=");
    return [line.slice(0, index), line.slice(index + 1)];
  }));
}

async function handleLeads(request, response) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    sendJson(response, 500, { error: "Missing Supabase configuration" });
    return;
  }

  if (request.method === "GET") {
    const result = await supabaseFetch("/site_leads?select=*&order=created_at.desc");
    sendJson(response, result.status, await result.json());
    return;
  }

  if (request.method === "POST") {
    const body = await readJson(request);
    const payload = {
      name: String(body.name || "").trim(),
      company: String(body.company || "").trim() || null,
      email: String(body.email || "").trim(),
      phone: String(body.phone || "").trim() || null,
      service: String(body.service || "").trim() || null,
      message: String(body.message || "").trim() || null,
      status: body.status || "nuovo",
      metadata: body.metadata || { source: "bmg_hub_local" }
    };

    if (!payload.name || !payload.email) {
      sendJson(response, 400, { error: "name and email are required" });
      return;
    }

    const result = await supabaseFetch("/site_leads", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    sendJson(response, result.status, await result.json());
    return;
  }

  sendJson(response, 405, { error: "Method not allowed" });
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

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

async function serveStatic(pathname, response) {
  const cleanPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = normalize(join(publicRoot, cleanPath));

  if (!filePath.startsWith(publicRoot) || !existsSync(filePath)) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, { "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream" });
  createReadStream(filePath).pipe(response);
}
