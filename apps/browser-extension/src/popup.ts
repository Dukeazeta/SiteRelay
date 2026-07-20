import type { SiteRelayCapture } from "@siterelay/capture-schema";

import { isInspectableUrl, readableError, sourceHostname } from "./popup-utils.js";

interface CaptureListItem {
  id: string;
  captureName?: string;
  title: string;
  sourceUrl: string;
  captureMode?: SiteRelayCapture["captureMode"];
  stateLabel?: string;
  createdAt: string;
  nodeCount: number;
}

const button = document.querySelector<HTMLButtonElement>("#select");
const feedback = document.querySelector<HTMLElement>("#feedback");
const service = document.querySelector<HTMLElement>("#service");
const serviceLabel = document.querySelector<HTMLElement>("#service-label");
const captureList = document.querySelector<HTMLOListElement>("#capture-list");
const pendingLabel = document.querySelector<HTMLElement>("#pending");
const captureName = document.querySelector<HTMLInputElement>("#capture-name");
const stateLabel = document.querySelector<HTMLSelectElement>("#state-label");

function sendMessage<T>(message: unknown): Promise<T> {
  return chrome.runtime.sendMessage(message) as Promise<T>;
}

async function startInspector(tabId: number, options: object): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "SITERELAY_START_SELECTION", options });
  } catch {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
    await chrome.tabs.sendMessage(tabId, { type: "SITERELAY_START_SELECTION", options });
  }
}

function setServiceState(state: "online" | "offline" | "checking", label: string): void {
  if (service) service.dataset.state = state;
  if (serviceLabel) serviceLabel.textContent = label;
}

function renderCaptures(captures: CaptureListItem[]): void {
  if (!captureList) return;
  captureList.replaceChildren();
  if (!captures.length) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "No captures yet. Your next selection will appear here.";
    captureList.append(empty);
    return;
  }
  captures.slice(0, 6).forEach((capture, index) => {
    const item = document.createElement("li");
    const sourceHost = sourceHostname(capture.sourceUrl);
    const indexElement = document.createElement("span");
    indexElement.className = "capture-index";
    indexElement.textContent = String(index + 1).padStart(2, "0");
    const title = document.createElement("span");
    title.className = "capture-title";
    const strong = document.createElement("strong");
    strong.textContent = capture.captureName || capture.title || "Untitled capture";
    const small = document.createElement("small");
    small.textContent = sourceHost;
    title.append(strong, small);
    const meta = document.createElement("span");
    meta.className = "capture-meta";
    meta.textContent = `${capture.captureMode ?? "component"}\n${capture.nodeCount} nodes`;
    const remove = document.createElement("button");
    remove.className = "capture-delete";
    remove.type = "button";
    remove.setAttribute("aria-label", `Delete ${strong.textContent}`);
    remove.textContent = "×";
    remove.addEventListener("click", async () => {
      if (!window.confirm(`Delete the local capture “${strong.textContent}”? This cannot be undone.`)) return;
      await sendMessage({ type: "SITERELAY_DELETE_CAPTURE", id: capture.id });
      await refreshStatus();
    });
    item.append(indexElement, title, meta, remove);
    captureList.append(item);
  });
}

async function refreshStatus(): Promise<void> {
  try {
    const status = await sendMessage<{ ok: boolean; pendingCount?: number }>({ type: "SITERELAY_SERVICE_STATUS" });
    setServiceState(status.ok ? "online" : "offline", status.ok ? "Service online" : "Service offline");
    if (pendingLabel) pendingLabel.textContent = status.pendingCount ? `${status.pendingCount} queued` : "queue clear";

    if (!status.ok) {
      renderCaptures([]);
      if (feedback) feedback.textContent = "The local service is offline. Start SiteRelay, then refresh.";
      return;
    }
    const history = await sendMessage<{ ok: boolean; data?: { captures?: CaptureListItem[] }; pendingCount?: number }>({
      type: "SITERELAY_LIST_CAPTURES",
    });
    renderCaptures(history.data?.captures ?? []);
  } catch (error) {
    setServiceState("offline", "Extension worker unavailable");
    renderCaptures([]);
    if (feedback) {
      feedback.textContent = `SiteRelay could not contact its extension worker. Reload the extension once. ${readableError(error, "")}`.trim();
    }
  }
}

button?.addEventListener("click", async () => {
  if (!feedback || !button) return;
  button.disabled = true;
  feedback.textContent = "Preparing the page inspector…";
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !isInspectableUrl(tab.url)) {
    feedback.textContent = "Open a normal http:// or https:// website. Browser settings and extension-store pages are protected.";
    button.disabled = false;
    return;
  }
  const mode = document.querySelector<HTMLInputElement>('input[name="mode"]:checked')?.value ?? "component";
  try {
    await startInspector(tab.id, {
      captureName: captureName?.value.trim() || undefined,
      mode,
      stateLabel: stateLabel?.value || "default",
      assetAuthorization: document.querySelector<HTMLInputElement>("#asset-authorization")?.checked
        ? "user-authorized"
        : "metadata-only",
    });
    window.close();
  } catch (error) {
    feedback.textContent = `Inspector could not start: ${readableError(error, "Browser injection was refused.")}`;
    button.disabled = false;
  }
});

document.querySelector("#retry")?.addEventListener("click", async () => {
  if (feedback) feedback.textContent = "Retrying queued captures…";
  const result = await sendMessage<{ ok: boolean; data?: { pendingCount: number } }>({ type: "SITERELAY_RETRY_QUEUE" });
  if (feedback) feedback.textContent = result.ok ? "All queued captures were delivered." : `${result.data?.pendingCount ?? 0} capture(s) are still waiting.`;
  await refreshStatus();
});

document.querySelector("#refresh")?.addEventListener("click", () => void refreshStatus());
void refreshStatus();
