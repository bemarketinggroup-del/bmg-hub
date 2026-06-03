import { createReadStream, existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const HUB_BASIC_USER = process.env.HUB_BASIC_USER;
const HUB_BASIC_PASSWORD = process.env.HUB_BASIC_PASSWORD;
const publicRoot = join(process.cwd(), "public");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

export default function handler(request, response) {
  if (!hasBasicAccess(request)) {
    response.writeHead(401, {
      "Content-Type": "text/plain; charset=utf-8",
      "WWW-Authenticate": 'Basic realm="BMG Hub"'
    });
    response.end("Authentication required");
    return;
  }

  const requestUrl = new URL(request.url, `https://${request.headers.host}`);
  const cleanPath = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const filePath = normalize(join(publicRoot, cleanPath));

  if (!filePath.startsWith(publicRoot) || !existsSync(filePath)) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
    "Cache-Control": "private, no-store"
  });
  createReadStream(filePath).pipe(response);
}

function hasBasicAccess(request) {
  if (!HUB_BASIC_USER || !HUB_BASIC_PASSWORD) return false;
  const header = request.headers.authorization || "";
  if (!header.startsWith("Basic ")) return false;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  const username = decoded.slice(0, separator);
  const password = decoded.slice(separator + 1);
  return username === HUB_BASIC_USER && password === HUB_BASIC_PASSWORD;
}
