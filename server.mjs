import { createServer } from "node:http";
import { readFile, realpath } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)));
const PORT = Number(process.env.PORT) || 4173;
const HOST = process.env.HOST || "127.0.0.1";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg"
};

const PUBLIC_FILE = /^\/(?:index\.html|styles\.css|assets\/[\w-]+\.(?:js|svg)|assets\/history\/(?:dates|\d{4}-\d{2}-\d{2}(?:T\d{2}-\d{2}-\d{2}-\d{3})?)\.js|preview\/[\w-]+\.jpg)$/;

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent((request.url || "/").split("?")[0]);
  } catch {
    response.writeHead(400).end("Bad request");
    return;
  }
  if (pathname === "/") pathname = "/index.html";

  try {
    if (!PUBLIC_FILE.test(pathname)) {
      response.writeHead(404).end("Not found");
      return;
    }
    const target = await realpath(join(ROOT, pathname));
    if (target !== join(await realpath(ROOT), pathname)) {
      response.writeHead(404).end("Not found");
      return;
    }
    const body = await readFile(target);

    response.writeHead(200, {
      "Content-Type": MIME[extname(target).toLowerCase()] || "application/octet-stream",
      "Content-Length": body.length,
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff"
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`择卡 local: http://${HOST}:${PORT}`);
});
