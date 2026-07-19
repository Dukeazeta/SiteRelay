import { z } from "zod";

export const rectSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
  top: z.number(),
  right: z.number(),
  bottom: z.number(),
  left: z.number(),
});

export const capturedNodeSchema = z.object({
  path: z.string().min(1),
  tagName: z.string().min(1),
  html: z.string(),
  text: z.string(),
  attributes: z.record(z.string(), z.string()),
  styles: z.record(z.string(), z.string()),
  rect: rectSchema,
  pseudoElements: z.object({
    before: z.record(z.string(), z.string()).optional(),
    after: z.record(z.string(), z.string()).optional(),
  }).optional(),
  accessibility: z.object({
    role: z.string().optional(),
    name: z.string().optional(),
    tabIndex: z.number(),
    disabled: z.boolean(),
    hidden: z.boolean(),
  }).optional(),
  shadowRootHtml: z.string().optional(),
});

export const fontSchema = z.object({
  family: z.string(),
  style: z.string(),
  weight: z.string(),
  stretch: z.string(),
  status: z.string().optional(),
  source: z.string().url().optional(),
  format: z.string().optional(),
  variationSettings: z.string().optional(),
  featureSettings: z.string().optional(),
  size: z.string().optional(),
  lineHeight: z.string().optional(),
  letterSpacing: z.string().optional(),
  renderedFamily: z.string().optional(),
});

export const assetSchema = z.object({
  kind: z.enum(["image", "background", "video", "audio", "svg", "font"]),
  url: z.string(),
  nodePath: z.string().optional(),
  descriptor: z.string().optional(),
  licenseStatus: z.enum(["unknown", "metadata-only", "download-permitted"]).default("unknown"),
});

export const animationSchema = z.object({
  nodePath: z.string(),
  id: z.string(),
  playState: z.string(),
  currentTime: z.number().nullable(),
  startTime: z.number().nullable(),
  playbackRate: z.number(),
  timing: z.record(z.string(), z.unknown()),
  keyframes: z.array(z.record(z.string(), z.unknown())),
});

export const viewportSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  devicePixelRatio: z.number().positive(),
  scrollX: z.number(),
  scrollY: z.number(),
  documentWidth: z.number().positive().optional(),
  documentHeight: z.number().positive().optional(),
  profile: z.enum(["current", "mobile", "tablet", "desktop", "custom"]).default("current"),
});

export const designTokenSchema = z.object({
  colors: z.array(z.string()),
  fontFamilies: z.array(z.string()),
  fontSizes: z.array(z.string()),
  spacing: z.array(z.string()),
  radii: z.array(z.string()),
  shadows: z.array(z.string()),
});

export const captureStateSchema = z.object({
  label: z.string().min(1),
  capturedAt: z.string().datetime(),
  selector: z.string(),
  screenshotDataUrl: z.string().startsWith("data:image/").optional(),
});

export const captureSchema = z.object({
  schemaVersion: z.union([z.literal(1), z.literal(2)]),
  id: z.string().min(1),
  createdAt: z.string().datetime(),
  source: z.object({
    url: z.string().url(),
    title: z.string(),
    userAgent: z.string(),
  }),
  selection: z.object({
    selector: z.string(),
    outerHTML: z.string(),
    rect: rectSchema,
  }),
  viewport: viewportSchema,
  nodes: z.array(capturedNodeSchema),
  fonts: z.array(fontSchema),
  assets: z.array(assetSchema),
  animations: z.array(animationSchema),
  screenshotDataUrl: z.string().startsWith("data:image/").optional(),
  fullPageScreenshotDataUrl: z.string().startsWith("data:image/").optional(),
  responsiveScreenshots: z.array(z.object({
    profile: z.enum(["mobile", "tablet", "desktop"]),
    width: z.number().positive(),
    height: z.number().positive(),
    screenshotDataUrl: z.string().startsWith("data:image/").optional(),
  })).default([]),
  captureName: z.string().optional(),
  captureMode: z.enum(["component", "section", "viewport", "full-page"]).default("component"),
  stateLabel: z.string().default("default"),
  assetAuthorization: z.enum(["metadata-only", "user-authorized"]).default("metadata-only"),
  groupId: z.string().optional(),
  designTokens: designTokenSchema.optional(),
  states: z.array(captureStateSchema).default([]),
  styleSheetRules: z.array(z.object({
    href: z.string().optional(),
    cssText: z.string(),
  })).default([]),
  limitations: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});

export type SiteRelayCapture = z.infer<typeof captureSchema>;
export type CapturedNode = z.infer<typeof capturedNodeSchema>;

export function parseCapture(input: unknown): SiteRelayCapture {
  return captureSchema.parse(input);
}
