import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { join } from "node:path";
import { z } from "zod";

import { compareImages } from "./compare.js";
import { downloadCaptureAssets } from "./assets.js";
import { captureDirectory, comparisonDirectory, reconstructionDirectory } from "./config.js";
import { reconstructCapture } from "./reconstruct.js";
import { CaptureStore } from "./store.js";

const store = new CaptureStore(captureDirectory);
const server = new McpServer({ name: "siterelay", version: "0.1.0" });

server.registerTool(
  "list_captures",
  {
    description: "List SiteRelay browser captures, newest first.",
    inputSchema: {},
  },
  async () => ({
    content: [{ type: "text", text: JSON.stringify(await store.list(), null, 2) }],
  }),
);

server.registerTool(
  "get_capture_summary",
  {
    description: "Read compact metadata, warnings, limitations, counts, and viewport details without loading the entire capture.",
    inputSchema: { id: z.string().describe("Capture ID returned by list_captures") },
  },
  async ({ id }) => {
    const capture = await store.get(id);
    return { content: [{ type: "text", text: JSON.stringify({
      id: capture.id,
      captureName: capture.captureName,
      createdAt: capture.createdAt,
      source: capture.source,
      selection: capture.selection,
      viewport: capture.viewport,
      captureMode: capture.captureMode,
      stateLabel: capture.stateLabel,
      counts: { nodes: capture.nodes.length, fonts: capture.fonts.length, assets: capture.assets.length, animations: capture.animations.length },
      warnings: capture.warnings,
      limitations: capture.limitations,
    }, null, 2) }] };
  },
);

server.registerTool(
  "get_capture",
  {
    description: "Read the exact DOM, computed styles, fonts, assets, animations, and metadata for a SiteRelay capture.",
    inputSchema: { id: z.string().describe("Capture ID returned by list_captures") },
  },
  async ({ id }) => ({
    content: [{ type: "text", text: JSON.stringify(await store.get(id), null, 2) }],
  }),
);

server.registerTool(
  "get_capture_screenshot",
  {
    description: "View the browser screenshot associated with a SiteRelay capture.",
    inputSchema: {
      id: z.string().describe("Capture ID returned by list_captures"),
      kind: z.enum(["selection", "viewport"]).default("selection"),
    },
  },
  async ({ id, kind }) => ({
    content: [{ type: "image", data: (await store.screenshot(id, kind)).toString("base64"), mimeType: "image/png" }],
  }),
);

server.registerTool(
  "get_capture_node",
  {
    description: "Read one captured node and its exact attributes, computed styles, pseudo-elements, accessibility, and geometry.",
    inputSchema: { id: z.string(), path: z.string().describe("Node path such as :scope or :scope > div:nth-of-type(1)") },
  },
  async ({ id, path }) => ({ content: [{ type: "text", text: JSON.stringify(await store.getNode(id, path), null, 2) }] }),
);

server.registerTool(
  "get_responsive_screenshot",
  {
    description: "View a full-page mobile, tablet, or desktop reference screenshot from a full-page capture.",
    inputSchema: { id: z.string(), profile: z.enum(["mobile", "tablet", "desktop"]) },
  },
  async ({ id, profile }) => ({
    content: [{ type: "image", data: (await store.responsiveScreenshot(id, profile)).toString("base64"), mimeType: "image/png" }],
  }),
);

server.registerTool(
  "search_capture",
  {
    description: "Search node paths, tags, text, and attributes without loading the full capture.",
    inputSchema: { id: z.string(), query: z.string().min(1) },
  },
  async ({ id, query }) => ({ content: [{ type: "text", text: JSON.stringify(await store.search(id, query), null, 2) }] }),
);

for (const section of ["fonts", "assets", "animations", "designTokens", "styleSheetRules"] as const) {
  server.registerTool(
    `get_capture_${section === "designTokens" ? "design_tokens" : section === "styleSheetRules" ? "stylesheet_rules" : section}`,
    {
      description: `Read only the captured ${section} data.`,
      inputSchema: { id: z.string() },
    },
    async ({ id }) => {
      const capture = await store.get(id);
      return { content: [{ type: "text", text: JSON.stringify(capture[section], null, 2) }] };
    },
  );
}

server.registerTool(
  "generate_react_reconstruction",
  {
    description: "Generate a raw fidelity-first React component and computed CSS from a SiteRelay capture.",
    inputSchema: { id: z.string() },
  },
  async ({ id }) => ({
    content: [{ type: "text", text: JSON.stringify(await reconstructCapture(await store.get(id), reconstructionDirectory), null, 2) }],
  }),
);

server.registerTool(
  "download_capture_assets",
  {
    description: "Download captured images/fonts/assets only after the user confirms they are authorized to reuse them; writes a provenance and SHA-256 manifest.",
    inputSchema: {
      id: z.string(),
      confirmAuthorized: z.literal(true).describe("Must be true only after the user explicitly confirms authorization to download and reuse the captured assets"),
    },
  },
  async ({ id }) => ({
    content: [{ type: "text", text: JSON.stringify(await downloadCaptureAssets(await store.get(id), reconstructionDirectory), null, 2) }],
  }),
);

server.registerTool(
  "compare_capture_to_screenshot",
  {
    description: "Compare a capture's source screenshot against a rendered candidate PNG and produce an exact difference heatmap.",
    inputSchema: { id: z.string(), candidatePath: z.string().describe("Absolute path to the candidate PNG") },
  },
  async ({ id, candidatePath }) => {
    const output = join(comparisonDirectory, `${id}-${Date.now()}`);
    const result = await compareImages(await store.screenshot(id), candidatePath, output);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.registerTool(
  "get_latest_capture",
  {
    description: "Read the newest SiteRelay capture without first looking up its ID.",
    inputSchema: {},
  },
  async () => {
    const [latest] = await store.list();
    if (!latest) return { content: [{ type: "text", text: "No SiteRelay captures are available." }] };
    return {
      content: [{ type: "text", text: JSON.stringify(await store.get(latest.id), null, 2) }],
    };
  },
);

await server.connect(new StdioServerTransport());
