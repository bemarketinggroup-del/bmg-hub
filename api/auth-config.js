import { jsonHeaders, publicAuthConfig } from "./_auth.js";

const headers = jsonHeaders("GET,OPTIONS");

export default function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers);
    response.end();
    return;
  }

  if (request.method !== "GET") {
    response.writeHead(405, headers);
    response.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  response.writeHead(200, headers);
  response.end(JSON.stringify(publicAuthConfig()));
}
