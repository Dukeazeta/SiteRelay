import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { SiteRelayCapture } from "@siterelay/capture-schema";

const VISUAL_PROPERTIES = [
  "align-content", "align-items", "align-self", "aspect-ratio", "backdrop-filter", "background",
  "background-color", "background-image", "background-position", "background-repeat", "background-size",
  "border", "border-bottom", "border-color", "border-left", "border-radius", "border-right", "border-top",
  "bottom", "box-shadow", "box-sizing", "clip-path", "color", "column-gap", "display", "filter", "flex",
  "flex-basis", "flex-direction", "flex-grow", "flex-shrink", "flex-wrap", "font-family", "font-feature-settings",
  "font-size", "font-stretch", "font-style", "font-variation-settings", "font-weight", "gap", "grid-auto-columns",
  "grid-auto-flow", "grid-auto-rows", "grid-column", "grid-row", "grid-template-columns", "grid-template-rows",
  "height", "inset", "justify-content", "justify-items", "justify-self", "left", "letter-spacing", "line-height",
  "margin", "margin-bottom", "margin-left", "margin-right", "margin-top", "mask-image", "max-height", "max-width",
  "min-height", "min-width", "object-fit", "object-position", "opacity", "order", "outline", "overflow",
  "overflow-x", "overflow-y", "padding", "padding-bottom", "padding-left", "padding-right", "padding-top", "position",
  "right", "row-gap", "text-align", "text-decoration", "text-transform", "text-wrap", "top", "transform",
  "transform-origin", "transition", "vertical-align", "visibility", "white-space", "width", "word-break", "z-index",
] as const;

function componentName(capture: SiteRelayCapture): string {
  const source = capture.captureName || capture.source.title || "CapturedComponent";
  const normalized = source.replace(/[^a-zA-Z0-9]+/g, " ").trim().split(/\s+/).map((part) =>
    `${part.charAt(0).toUpperCase()}${part.slice(1)}`,
  ).join("");
  return /^[A-Z]/.test(normalized) ? normalized : `Captured${normalized || "Component"}`;
}

function cssSelector(path: string): string {
  const root = ".siterelay-stage > :first-child";
  return path === ":scope" ? root : path.replace(":scope", root);
}

function cssForCapture(capture: SiteRelayCapture): string {
  return capture.nodes.map((node) => {
    const declarations = VISUAL_PROPERTIES.flatMap((property) => {
      const value = node.styles[property];
      return value ? [`  ${property}: ${value};`] : [];
    });
    const pseudo = (["before", "after"] as const).flatMap((name) => {
      const styles = node.pseudoElements?.[name];
      if (!styles) return [];
      const values = VISUAL_PROPERTIES.flatMap((property) => styles[property] ? [`  ${property}: ${styles[property]};`] : []);
      if (styles.content) values.unshift(`  content: ${styles.content};`);
      return [`${cssSelector(node.path)}::${name} {`, ...values, "}"];
    });
    return [`${cssSelector(node.path)} {`, ...declarations, "}", ...pseudo].join("\n");
  }).join("\n\n");
}

export async function reconstructCapture(capture: SiteRelayCapture, rootDirectory: string) {
  const name = componentName(capture);
  const directory = join(rootDirectory, capture.id);
  await mkdir(directory, { recursive: true });
  const escapedHtml = JSON.stringify(capture.selection.outerHTML);
  const component = `import "./siterelay.css";\n\nexport function ${name}() {\n  return (\n    <div\n      className="siterelay-stage"\n      data-siterelay-capture=${JSON.stringify(capture.id)}\n      dangerouslySetInnerHTML={{ __html: ${escapedHtml} }}\n    />\n  );\n}\n`;
  const readme = `# ${name}\n\nGenerated from SiteRelay capture \`${capture.id}\`.\n\nThis is the raw fidelity pass. It intentionally preserves the captured HTML through \`dangerouslySetInnerHTML\`. Review the source and asset licensing, then refactor it into semantic React components only after visual comparison passes.\n`;
  const css = `${cssForCapture(capture)}\n`;
  const preview = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1" />\n<base href=${JSON.stringify(capture.source.url)} />\n<style>html,body{margin:0;min-height:100%;}.siterelay-stage{min-height:100vh;}\n${css}</style>\n</head>\n<body><div class="siterelay-stage">${capture.selection.outerHTML}</div></body>\n</html>\n`;
  await Promise.all([
    writeFile(join(directory, `${name}.tsx`), component, "utf8"),
    writeFile(join(directory, "siterelay.css"), css, "utf8"),
    writeFile(join(directory, "preview.html"), preview, "utf8"),
    writeFile(join(directory, "README.md"), readme, "utf8"),
  ]);
  return {
    directory,
    componentPath: join(directory, `${name}.tsx`),
    cssPath: join(directory, "siterelay.css"),
    previewPath: join(directory, "preview.html"),
    name,
  };
}
