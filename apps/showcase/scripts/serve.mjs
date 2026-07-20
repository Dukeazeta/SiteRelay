import { createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve("dist");
const port = Number(process.env.PORT ?? 4321);
const mime = { ".css": "text/css", ".html": "text/html", ".js": "text/javascript", ".svg": "image/svg+xml" };

createServer((request, response) => {
  const pathname = request.url === "/" ? "/index.html" : request.url?.split("?")[0] ?? "/index.html";
  const file = normalize(join(root, pathname));
  if (!file.startsWith(root) || !existsSync(file)) {
    response.writeHead(404).end("Not found");
    return;
  }
  response.writeHead(200, { "content-type": `${mime[extname(file)] ?? "application/octet-stream"}; charset=utf-8` });
  createReadStream(file).pipe(response);
}).listen(port, "127.0.0.1", () => console.log(`SiteRelay showcase: http://127.0.0.1:${port}`));
