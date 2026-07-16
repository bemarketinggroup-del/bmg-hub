import { createReadStream, existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import handlePed from "../lib/ped.js";
import { handlePedShareAdmin, handlePublicPed } from "../lib/ped-share.js";
import { handleSmartWorking } from "../lib/smart-working.js";

const publicRoot = join(process.cwd(), "public");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webp": "image/webp"
};

export default async function handler(request, response) {
  const requestUrl = new URL(request.url, `https://${request.headers.host}`);
  if (requestUrl.pathname === "/api/smart-working") {
    await handleSmartWorking(request, response);
    return;
  }
  if (requestUrl.pathname === "/api/ped") {
    await handlePed(request, response);
    return;
  }
  if (requestUrl.pathname === "/api/ped-share") {
    await handlePedShareAdmin(request, response);
    return;
  }
  if (requestUrl.pathname === "/api/public-ped") {
    await handlePublicPed(request, response);
    return;
  }

  const cleanPath = requestUrl.pathname === "/"
    ? "/index.html"
    : requestUrl.pathname === "/ped-share" || requestUrl.pathname === "/ped-share/"
      ? "/ped-share.html"
      : requestUrl.pathname;
  const filePath = normalize(join(publicRoot, cleanPath));

  if (!filePath.startsWith(publicRoot) || !existsSync(filePath)) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const securityHeaders = cleanPath === "/ped-share.html" ? {
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; frame-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-Robots-Tag": "noindex, nofollow, noarchive"
  } : {};
  response.writeHead(200, {
    "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
    "Cache-Control": "private, no-store",
    ...securityHeaders
  });
  createReadStream(filePath).pipe(response);
}
