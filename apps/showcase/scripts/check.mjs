import { readFileSync } from "node:fs";

for (const file of ["src/index.html", "src/styles.css", "src/showcase.js"]) {
  const content = readFileSync(file, "utf8");
  if (!content.trim()) throw new Error(`${file} is empty`);
}
console.log("Showcase source files are present.");
