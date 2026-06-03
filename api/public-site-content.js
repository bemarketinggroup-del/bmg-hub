const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://bemarketinggroup-del.github.io";

function headers() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=60, s-maxage=60"
  };
}

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers());
    response.end();
    return;
  }

  if (request.method !== "GET") {
    response.writeHead(405, headers());
    response.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    response.writeHead(500, headers());
    response.end(JSON.stringify({ error: "Missing Supabase environment variables" }));
    return;
  }

  const result = await fetch(`${SUPABASE_URL}/rest/v1/site_content?select=slug,type,title,status,payload,updated_at&status=eq.published&order=slug.asc`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });

  response.writeHead(result.status, headers());
  response.end(await result.text());
}
