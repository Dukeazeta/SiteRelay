import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("showcase exposes captureable states and accessibility fallbacks", async () => {
  const [html, css] = await Promise.all([
    readFile(new URL("../src/index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/styles.css", import.meta.url), "utf8"),
  ]);
  assert.match(html, /data-capture-target="signal-card"/);
  assert.match(html, /aria-pressed="false"/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /:focus-visible/);
});
