/**
 * render-start.mjs
 * Minimal Node.js HTTP adapter for Render deployment.
 * Wraps the TanStack Start fetch-handler (dist/server/server.js)
 * in a standard Node http server so the process stays alive.
 */
import http from "node:http";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lookup } from "node:dns";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- load the compiled TanStack Start server bundle ---
const { default: serverHandler } = await import("./dist/server/server.js");

const PORT = process.env.PORT || 3000;
const CLIENT_DIST = path.join(__dirname, "dist", "client");

// Mime types for static assets
const MIME = {
  ".js":   "application/javascript",
  ".mjs":  "application/javascript",
  ".css":  "text/css",
  ".html": "text/html",
  ".json": "application/json",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
};

function serveStatic(filePath, res) {
  const ext = path.extname(filePath);
  const mime = MIME[ext] || "application/octet-stream";
  res.setHeader("Content-Type", mime);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Serve static files from dist/client
  const staticFile = path.join(CLIENT_DIST, url.pathname);
  if (existsSync(staticFile) && !url.pathname.endsWith("/")) {
    return serveStatic(staticFile, res);
  }

  // Build a WHATWG Request and forward to the TanStack Start fetch handler
  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (v !== undefined) headers[k] = Array.isArray(v) ? v.join(", ") : v;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;

  const request = new Request(url.toString(), {
    method:  req.method,
    headers,
    body:    ["GET", "HEAD"].includes(req.method ?? "GET") ? undefined : body,
  });

  try {
    const response = await serverHandler.fetch(request, {}, {});
    res.statusCode = response.status;
    for (const [k, v] of response.headers.entries()) {
      res.setHeader(k, v);
    }
    const buf = await response.arrayBuffer();
    res.end(Buffer.from(buf));
  } catch (err) {
    console.error("Server error:", err);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
});

server.listen(PORT, () => {
  console.log(`✅ CoolTrack server running on port ${PORT}`);
});
