import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { captureDirectory, maxRequestBytes, serviceHost, servicePort, serviceToken } from "./config.js";
import { CaptureStore } from "./store.js";

const store = new CaptureStore(captureDirectory);

function allowedOrigin(request: IncomingMessage): string | undefined {
  const origin = request.headers.origin;
  if (!origin) return undefined;
  return origin.startsWith("chrome-extension://") ? origin : undefined;
}

function respond(request: IncomingMessage, response: ServerResponse, status: number, body: unknown): void {
  const origin = allowedOrigin(request);
  response.writeHead(status, {
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "DELETE,GET,POST,OPTIONS",
    ...(origin ? { "access-control-allow-origin": origin, vary: "origin" } : {}),
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maxRequestBytes) throw new Error(`Capture exceeds the ${Math.round(maxRequestBytes / 1024 / 1024)} MB request limit`);
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = createServer(async (request, response) => {
  try {
    if (request.headers.origin && !allowedOrigin(request)) {
      return respond(request, response, 403, { error: "Origin is not permitted" });
    }
    if (request.method === "OPTIONS") return respond(request, response, 204, {});
    if (request.method === "GET" && request.url === "/health") {
      return respond(request, response, 200, { ok: true, service: "siterelay-capture-service", schemaVersion: 2 });
    }
    if (request.headers.authorization !== `Bearer ${serviceToken}`) {
      return respond(request, response, 401, { error: "Valid SiteRelay authorization is required" });
    }
    if (request.method === "GET" && request.url === "/api/captures") {
      return respond(request, response, 200, { captures: await store.list() });
    }
    if (request.method === "POST" && request.url === "/api/captures") {
      const summary = await store.save(await readJson(request));
      return respond(request, response, 201, { capture: summary });
    }
    const captureMatch = /^\/api\/captures\/([a-zA-Z0-9-]+)$/.exec(request.url ?? "");
    if (request.method === "DELETE" && captureMatch?.[1]) {
      await store.remove(captureMatch[1]);
      return respond(request, response, 200, { ok: true, deleted: captureMatch[1] });
    }
    return respond(request, response, 404, { error: "Not found" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return respond(request, response, 400, { error: message });
  }
});

server.listen(servicePort, serviceHost, () => {
  console.info(`SiteRelay capture service listening on http://${serviceHost}:${servicePort}`);
  console.info(`Captures will be stored in ${captureDirectory}`);
});
