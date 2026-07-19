import type { SiteRelayCapture } from "@siterelay/capture-schema";

const OVERLAY_ID = "siterelay-selection-overlay";
const MAX_NODES = 2_000;

interface CaptureOptions {
  captureName?: string;
  mode: SiteRelayCapture["captureMode"];
  stateLabel: string;
  assetAuthorization: SiteRelayCapture["assetAuthorization"];
}

let selecting = false;
let hoveredElement: Element | null = null;
let activeOptions: CaptureOptions = { mode: "component", stateLabel: "default", assetAuthorization: "metadata-only" };

function toRect(rect: DOMRect) {
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
  };
}

function elementPath(element: Element, root: Element): string {
  if (element === root) return ":scope";

  const parts: string[] = [];
  let current: Element | null = element;
  while (current && current !== root) {
    const parent: Element | null = current.parentElement;
    if (!parent) break;
    const siblings = Array.from(parent.children).filter((child) => child.tagName === current?.tagName);
    const index = siblings.indexOf(current) + 1;
    parts.unshift(`${current.tagName.toLowerCase()}:nth-of-type(${index})`);
    current = parent;
  }
  return `:scope > ${parts.join(" > ")}`;
}

function stableSelector(element: Element): string {
  if (element === document.documentElement) return "html";
  if (element.id) return `#${CSS.escape(element.id)}`;

  const parts: string[] = [];
  let current: Element | null = element;
  while (current && current !== document.documentElement) {
    const parent: Element | null = current.parentElement;
    if (!parent) break;
    const index = Array.from(parent.children).indexOf(current) + 1;
    parts.unshift(`${current.tagName.toLowerCase()}:nth-child(${index})`);
    current = parent;
  }
  return parts.join(" > ");
}

function computedStyles(element: Element, pseudo?: "::before" | "::after"): Record<string, string> {
  const computed = getComputedStyle(element, pseudo);
  return Object.fromEntries(Array.from(computed).map((property) => [property, computed.getPropertyValue(property)]));
}

function pseudoStyles(element: Element, pseudo: "::before" | "::after"): Record<string, string> | undefined {
  const styles = computedStyles(element, pseudo);
  const content = styles.content;
  if (!content || content === "none" || content === "normal") return undefined;
  return styles;
}

function accessibleName(element: Element): string | undefined {
  return element.getAttribute("aria-label")
    ?? element.getAttribute("alt")
    ?? element.getAttribute("title")
    ?? element.textContent?.trim().slice(0, 500)
    ?? undefined;
}

function attributes(element: Element): Record<string, string> {
  return Object.fromEntries(Array.from(element.attributes).map(({ name, value }) => [name, value]));
}

function collectNodes(root: Element, warnings: string[]) {
  const elements = [root, ...Array.from(root.querySelectorAll("*"))];
  if (elements.length > MAX_NODES) {
    warnings.push(`Selection contains ${elements.length} elements; only the first ${MAX_NODES} were captured.`);
  }

  return elements.slice(0, MAX_NODES).map((element) => {
    const styles = computedStyles(element);
    const htmlElement = element as HTMLElement;
    return {
      path: elementPath(element, root),
      tagName: element.tagName.toLowerCase(),
      html: element === root ? element.outerHTML : "",
      text: element.textContent?.trim().slice(0, 20_000) ?? "",
      attributes: attributes(element),
      styles,
      rect: toRect(element.getBoundingClientRect()),
      pseudoElements: {
        before: pseudoStyles(element, "::before"),
        after: pseudoStyles(element, "::after"),
      },
      accessibility: {
        role: element.getAttribute("role") ?? undefined,
        name: accessibleName(element),
        tabIndex: htmlElement.tabIndex ?? -1,
        disabled: element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true",
        hidden: element.getAttribute("aria-hidden") === "true" || styles.display === "none" || styles.visibility === "hidden",
      },
      shadowRootHtml: element.shadowRoot?.innerHTML,
    };
  });
}

interface FontFaceMetadata {
  source?: string;
  format?: string;
}

function flattenRules(rules: CSSRuleList): CSSRule[] {
  const flattened: CSSRule[] = [];
  for (const rule of Array.from(rules)) {
    flattened.push(rule);
    if ("cssRules" in rule && rule.cssRules instanceof CSSRuleList) {
      flattened.push(...flattenRules(rule.cssRules));
    }
  }
  return flattened;
}

function collectFontSources(warnings: string[]): Map<string, FontFaceMetadata> {
  const sources = new Map<string, FontFaceMetadata>();
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of flattenRules(sheet.cssRules)) {
        if (!(rule instanceof CSSFontFaceRule)) continue;
        const family = rule.style.getPropertyValue("font-family").replace(/["']/g, "").trim();
        const src = rule.style.getPropertyValue("src");
        const url = /url\(["']?([^"')]+)["']?\)/.exec(src)?.[1];
        const format = /format\(["']?([^"')]+)["']?\)/.exec(src)?.[1];
        if (family && url) sources.set(family, { source: new URL(url, sheet.href ?? location.href).href, format });
      }
    } catch {
      warnings.push(`Cross-origin stylesheet could not be inspected: ${sheet.href ?? "inline stylesheet"}`);
    }
  }
  return sources;
}

function collectFonts(root: Element, warnings: string[]) {
  const fontSources = collectFontSources(warnings);
  const seen = new Set<string>();
  const fonts = [];
  for (const element of [root, ...Array.from(root.querySelectorAll("*"))]) {
    const style = getComputedStyle(element);
    const family = style.fontFamily;
    const key = [family, style.fontStyle, style.fontWeight, style.fontStretch].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    const primaryFamily = family.split(",")[0]?.replace(/["']/g, "").trim() ?? family;
    const metadata = fontSources.get(primaryFamily);
    fonts.push({
      family,
      style: style.fontStyle,
      weight: style.fontWeight,
      stretch: style.fontStretch,
      source: metadata?.source,
      format: metadata?.format,
      variationSettings: style.fontVariationSettings,
      featureSettings: style.fontFeatureSettings,
      size: style.fontSize,
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
      renderedFamily: document.fonts.check(`${style.fontWeight} ${style.fontSize} ${JSON.stringify(primaryFamily)}`)
        ? primaryFamily
        : undefined,
    });
  }
  return fonts;
}

function collectAssets(root: Element) {
  const assets: SiteRelayCapture["assets"] = [];
  const seen = new Set<string>();
  for (const element of [root, ...Array.from(root.querySelectorAll("*"))]) {
    const path = elementPath(element, root);
    const candidates: Array<{ kind: SiteRelayCapture["assets"][number]["kind"]; url?: string; descriptor?: string }> = [];
    if (element instanceof HTMLImageElement) candidates.push({ kind: "image", url: element.currentSrc || element.src });
    if (element instanceof HTMLImageElement && element.srcset) {
      for (const candidate of element.srcset.split(",")) {
        const [url, descriptor] = candidate.trim().split(/\s+/, 2);
        candidates.push({ kind: "image", url, descriptor });
      }
    }
    if (element instanceof HTMLSourceElement && element.srcset) {
      for (const candidate of element.srcset.split(",")) {
        const [url, descriptor] = candidate.trim().split(/\s+/, 2);
        candidates.push({ kind: "image", url, descriptor });
      }
    }
    if (element instanceof HTMLVideoElement) candidates.push({ kind: "video", url: element.currentSrc || element.src });
    if (element instanceof HTMLAudioElement) candidates.push({ kind: "audio", url: element.currentSrc || element.src });
    if (element instanceof SVGElement) candidates.push({ kind: "svg", url: `inline:${path}` });
    const renderedStyle = getComputedStyle(element);
    const imageProperties = [
      renderedStyle.backgroundImage,
      renderedStyle.maskImage,
      renderedStyle.borderImageSource,
      renderedStyle.listStyleImage,
      renderedStyle.cursor,
    ];
    for (const property of imageProperties) {
      for (const match of property.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
        candidates.push({ kind: "background", url: match[1] });
      }
    }

    for (const candidate of candidates) {
      if (!candidate.url) continue;
      const url = candidate.url.startsWith("inline:") ? candidate.url : new URL(candidate.url, location.href).href;
      const key = `${candidate.kind}|${url}|${path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      assets.push({ kind: candidate.kind, url, nodePath: path, descriptor: candidate.descriptor, licenseStatus: "unknown" });
    }
  }
  return assets;
}

function collectAnimations(root: Element) {
  return root.getAnimations({ subtree: true }).map((animation, index) => {
    const effect = animation.effect instanceof KeyframeEffect ? animation.effect : null;
    const target = effect?.target instanceof Element ? effect.target : root;
    return {
      nodePath: elementPath(target, root),
      id: animation.id || `animation-${index + 1}`,
      playState: animation.playState,
      currentTime: typeof animation.currentTime === "number" ? animation.currentTime : null,
      startTime: typeof animation.startTime === "number" ? animation.startTime : null,
      playbackRate: animation.playbackRate,
      timing: effect ? { ...effect.getTiming(), ...effect.getComputedTiming() } : {},
      keyframes: effect?.getKeyframes().map((keyframe) => ({ ...keyframe })) ?? [],
    };
  });
}

function collectStyleSheetRules(warnings: string[]): SiteRelayCapture["styleSheetRules"] {
  const collected: SiteRelayCapture["styleSheetRules"] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        collected.push({ href: sheet.href ?? undefined, cssText: rule.cssText });
      }
    } catch {
      const message = `Stylesheet rules unavailable because of browser cross-origin protections: ${sheet.href ?? "inline"}`;
      if (!warnings.includes(message)) warnings.push(message);
    }
  }
  return collected;
}

function designTokens(nodes: SiteRelayCapture["nodes"]): NonNullable<SiteRelayCapture["designTokens"]> {
  const collect = (property: string): string[] => Array.from(new Set(
    nodes.map((node) => node.styles[property]).filter((value): value is string => Boolean(value)),
  )).sort();
  const colors = new Set<string>();
  for (const property of ["color", "background-color", "border-top-color", "outline-color", "text-decoration-color"]) {
    for (const value of collect(property)) colors.add(value);
  }
  return {
    colors: Array.from(colors).sort(),
    fontFamilies: collect("font-family"),
    fontSizes: collect("font-size"),
    spacing: Array.from(new Set([
      ...collect("gap"), ...collect("padding-top"), ...collect("padding-right"),
      ...collect("padding-bottom"), ...collect("padding-left"), ...collect("margin-top"),
      ...collect("margin-right"), ...collect("margin-bottom"), ...collect("margin-left"),
    ])).sort(),
    radii: collect("border-radius"),
    shadows: collect("box-shadow").filter((value) => value !== "none"),
  };
}

function buildCapture(root: Element): SiteRelayCapture {
  const warnings: string[] = [];
  const limitations: string[] = [];
  const nodes = collectNodes(root, warnings);
  const fonts = collectFonts(root, warnings);
  const assets = collectAssets(root);
  for (const font of fonts) {
    if (!font.source || assets.some((asset) => asset.url === font.source)) continue;
    assets.push({ kind: "font", url: font.source, descriptor: `${font.family} ${font.weight} ${font.style}`, licenseStatus: "metadata-only" });
  }
  if (activeOptions.mode === "full-page") {
    limitations.push("Responsive reference screenshots are captured at mobile, tablet, and desktop widths; computed node styles describe the original interactive viewport only.");
  }
  if (root.querySelector("iframe")) {
    limitations.push("Cross-origin iframe contents are represented as iframe elements and cannot always be inspected.");
  }
  if (root.querySelector("canvas")) {
    limitations.push("Canvas and WebGL pixels are preserved in screenshots; their internal drawing commands are not reconstructed.");
  }
  return {
    schemaVersion: 2,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    source: { url: location.href, title: document.title, userAgent: navigator.userAgent },
    selection: {
      selector: stableSelector(root),
      outerHTML: root.outerHTML,
      rect: toRect(root.getBoundingClientRect()),
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      documentWidth: document.documentElement.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
      profile: window.innerWidth <= 480 ? "mobile" : window.innerWidth <= 1024 ? "tablet" : "desktop",
    },
    nodes,
    fonts,
    assets,
    animations: collectAnimations(root),
    captureName: activeOptions.captureName,
    captureMode: activeOptions.mode,
    stateLabel: activeOptions.stateLabel,
    assetAuthorization: activeOptions.assetAuthorization,
    groupId: activeOptions.captureName
      ? `${location.hostname}:${activeOptions.captureName.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-")}`
      : undefined,
    designTokens: designTokens(nodes),
    styleSheetRules: collectStyleSheetRules(warnings),
    states: [],
    responsiveScreenshots: [],
    limitations,
    warnings,
  };
}

function overlay(): HTMLDivElement {
  let element = document.querySelector<HTMLDivElement>(`#${OVERLAY_ID}`);
  if (element) return element;
  element = document.createElement("div");
  element.id = OVERLAY_ID;
  Object.assign(element.style, {
    position: "fixed",
    zIndex: "2147483647",
    pointerEvents: "none",
    border: "2px solid #d8ff52",
    background: "rgba(216, 255, 82, 0.08)",
    boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.65)",
    transition: "all 50ms linear",
  });
  document.documentElement.append(element);
  return element;
}

function stopSelection() {
  selecting = false;
  hoveredElement = null;
  document.querySelector(`#${OVERLAY_ID}`)?.remove();
  window.removeEventListener("mousemove", handleMove, true);
  window.removeEventListener("click", handleClick, true);
  window.removeEventListener("keydown", handleKeydown, true);
}

function showToast(message: string, tone: "success" | "error"): void {
  const toast = document.createElement("div");
  toast.setAttribute("role", tone === "error" ? "alert" : "status");
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed",
    right: "20px",
    bottom: "20px",
    zIndex: "2147483647",
    maxWidth: "380px",
    padding: "14px 16px",
    border: `1px solid ${tone === "success" ? "#d8ff52" : "#ff6b6b"}`,
    borderRadius: "12px",
    background: "#101114",
    boxShadow: "0 16px 50px rgba(0, 0, 0, 0.35)",
    color: "#f7f7f4",
    font: "600 13px/1.45 ui-sans-serif, system-ui, sans-serif",
  });
  document.documentElement.append(toast);
  window.setTimeout(() => toast.remove(), tone === "success" ? 4_000 : 9_000);
}

function handleMove(event: MouseEvent) {
  const target = event.target;
  if (!(target instanceof Element) || target.id === OVERLAY_ID) return;
  hoveredElement = target;
  const rect = target.getBoundingClientRect();
  Object.assign(overlay().style, {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== "Escape") return;
  event.preventDefault();
  stopSelection();
}

function handleClick(event: MouseEvent) {
  if (!hoveredElement) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const selected = activeOptions.mode === "section"
    ? hoveredElement.closest("section, article, main, header, footer, aside") ?? hoveredElement
    : hoveredElement;
  stopSelection();
  relayCapture(selected);
}

function relayCapture(selected: Element): void {
  const capture = buildCapture(selected);
  chrome.runtime.sendMessage({ type: "SITERELAY_CAPTURE", capture }, (response) => {
    if (chrome.runtime.lastError) {
      showToast(`SiteRelay capture failed: ${chrome.runtime.lastError.message}`, "error");
      return;
    }
    if (response?.queued) {
      showToast(`Capture saved to the retry queue. ${response.pendingCount} capture(s) are waiting for the local service.`, "error");
      return;
    }
    if (response?.ok) {
      showToast(`Captured ${selected.tagName.toLowerCase()} and sent it to Codex.`, "success");
      return;
    }
    showToast(
      `SiteRelay could not reach its local service. ${response?.error ?? "Start the SiteRelay service and try again."}`,
      "error",
    );
  });
}

function startSelection(options?: Partial<CaptureOptions>) {
  if (selecting) return;
  activeOptions = {
    captureName: options?.captureName,
    mode: options?.mode ?? "component",
    stateLabel: options?.stateLabel || "default",
    assetAuthorization: options?.assetAuthorization ?? "metadata-only",
  };
  if (activeOptions.mode === "full-page" || activeOptions.mode === "viewport") {
    hoveredElement = activeOptions.mode === "full-page" ? document.documentElement : document.body;
    const selected = hoveredElement;
    relayCapture(selected);
    hoveredElement = null;
    return;
  }
  selecting = true;
  overlay();
  window.addEventListener("mousemove", handleMove, true);
  window.addEventListener("click", handleClick, true);
  window.addEventListener("keydown", handleKeydown, true);
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "SITERELAY_START_SELECTION") startSelection(message.options);
});
