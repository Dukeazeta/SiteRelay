import { captureSchema } from "@siterelay/capture-schema";

declare const __SITERELAY_TOKEN__: string;
const PENDING_CAPTURE_KEY = "siterelayPendingCaptures";

async function serviceRequest(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`http://127.0.0.1:4319${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${__SITERELAY_TOKEN__}`,
      ...init.headers,
    },
  });
}

async function pendingCaptures(): Promise<unknown[]> {
  const result = await chrome.storage.local.get(PENDING_CAPTURE_KEY);
  return Array.isArray(result[PENDING_CAPTURE_KEY]) ? result[PENDING_CAPTURE_KEY] : [];
}

async function queueCapture(capture: unknown): Promise<number> {
  const pending = await pendingCaptures();
  pending.push(capture);
  await chrome.storage.local.set({ [PENDING_CAPTURE_KEY]: pending.slice(-20) });
  await chrome.alarms.create("siterelay-retry", { delayInMinutes: 1 });
  return pending.length;
}

async function postCapture(capture: unknown): Promise<unknown> {
  const response = await serviceRequest("/api/captures", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(capture),
  });
  if (!response.ok) throw new Error(`Capture service returned ${response.status}: ${await response.text()}`);
  return response.json();
}

async function flushCaptureQueue(): Promise<number> {
  const pending = await pendingCaptures();
  const remaining: unknown[] = [];
  for (const capture of pending) {
    try {
      await postCapture(capture);
    } catch {
      remaining.push(capture);
    }
  }
  await chrome.storage.local.set({ [PENDING_CAPTURE_KEY]: remaining });
  return remaining.length;
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "siterelay-retry") void flushCaptureQueue();
});

async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return `data:${blob.type};base64,${btoa(binary)}`;
}

async function cropScreenshot(
  screenshotDataUrl: string,
  capture: unknown,
): Promise<string> {
  const parsed = captureSchema.parse(capture);
  const image = await createImageBitmap(await (await fetch(screenshotDataUrl)).blob());
  const ratio = parsed.viewport.devicePixelRatio;
  const rect = parsed.selection.rect;
  const left = Math.max(0, Math.round(rect.left * ratio));
  const top = Math.max(0, Math.round(rect.top * ratio));
  const right = Math.min(image.width, Math.round(rect.right * ratio));
  const bottom = Math.min(image.height, Math.round(rect.bottom * ratio));
  const width = Math.max(1, right - left);
  const height = Math.max(1, bottom - top);
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser could not create a screenshot canvas");
  context.drawImage(image, left, top, width, height, 0, 0, width, height);
  image.close();
  return blobToDataUrl(await canvas.convertToBlob({ type: "image/png" }));
}

interface CaptureScreenshotResult {
  data: string;
}

async function captureFullPageReferences(tabId: number) {
  const target = { tabId };
  await chrome.debugger.attach(target, "1.3");
  try {
    await chrome.debugger.sendCommand(target, "Page.enable");
    const fullPage = await chrome.debugger.sendCommand(target, "Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      fromSurface: true,
    }) as CaptureScreenshotResult;
    const responsiveScreenshots = [];
    for (const profile of [
      { profile: "mobile" as const, width: 390, height: 844, deviceScaleFactor: 1 },
      { profile: "tablet" as const, width: 768, height: 1024, deviceScaleFactor: 1 },
      { profile: "desktop" as const, width: 1440, height: 1000, deviceScaleFactor: 1 },
    ]) {
      await chrome.debugger.sendCommand(target, "Emulation.setDeviceMetricsOverride", {
        width: profile.width,
        height: profile.height,
        deviceScaleFactor: profile.deviceScaleFactor,
        mobile: profile.profile === "mobile",
      });
      await new Promise((resolve) => setTimeout(resolve, 220));
      const screenshot = await chrome.debugger.sendCommand(target, "Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
        fromSurface: true,
      }) as CaptureScreenshotResult;
      responsiveScreenshots.push({
        profile: profile.profile,
        width: profile.width,
        height: profile.height,
        screenshotDataUrl: `data:image/png;base64,${screenshot.data}`,
      });
    }
    await chrome.debugger.sendCommand(target, "Emulation.clearDeviceMetricsOverride");
    return {
      fullPageScreenshotDataUrl: `data:image/png;base64,${fullPage.data}`,
      responsiveScreenshots,
    };
  } finally {
    await chrome.debugger.detach(target).catch(() => undefined);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "SITERELAY_CAPTURE") return false;

  void (async () => {
    let captureToQueue: unknown = message.capture;
    try {
      const screenshotOptions = { format: "png" as const };
      const screenshotDataUrl = sender.tab?.windowId === undefined
        ? await chrome.tabs.captureVisibleTab(screenshotOptions)
        : await chrome.tabs.captureVisibleTab(sender.tab.windowId, screenshotOptions);
      const selectionScreenshotDataUrl = await cropScreenshot(screenshotDataUrl, message.capture);
      const fullPageReferences = message.capture.captureMode === "full-page" && sender.tab?.id
        ? await captureFullPageReferences(sender.tab.id)
        : {};
      const capture = captureSchema.parse({
        ...message.capture,
        screenshotDataUrl: selectionScreenshotDataUrl,
        fullPageScreenshotDataUrl: message.capture.captureMode === "viewport" ? screenshotDataUrl : undefined,
        ...fullPageReferences,
      });
      captureToQueue = capture;
      sendResponse({ ok: true, result: await postCapture(capture) });
    } catch (error) {
      const queued = await queueCapture(captureToQueue);
      sendResponse({
        ok: true,
        queued: true,
        pendingCount: queued,
        error: error instanceof Error ? error.message : "Unknown capture error",
      });
    }
  })();

  return true;
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!["SITERELAY_SERVICE_STATUS", "SITERELAY_LIST_CAPTURES", "SITERELAY_RETRY_QUEUE", "SITERELAY_DELETE_CAPTURE"].includes(message?.type)) {
    return false;
  }

  void (async () => {
    try {
      if (message.type === "SITERELAY_RETRY_QUEUE") {
        const remaining = await flushCaptureQueue();
        sendResponse({ ok: remaining === 0, data: { pendingCount: remaining } });
        return;
      }
      if (message.type === "SITERELAY_DELETE_CAPTURE") {
        const response = await serviceRequest(`/api/captures/${encodeURIComponent(String(message.id))}`, { method: "DELETE" });
        sendResponse({ ok: response.ok, data: await response.json() });
        return;
      }
      const path = message.type === "SITERELAY_SERVICE_STATUS" ? "/health" : "/api/captures";
      const response = await serviceRequest(path);
      sendResponse({ ok: response.ok, data: await response.json(), pendingCount: (await pendingCaptures()).length });
    } catch (error) {
      sendResponse({ ok: false, error: error instanceof Error ? error.message : "Service unavailable" });
    }
  })();
  return true;
});
