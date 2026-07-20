const endpoint = "http://127.0.0.1:4319/health";

try {
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(5_000) });
  const health = await response.json();
  if (!response.ok || health.ok !== true) throw new Error(`Unexpected response: ${response.status}`);
  console.log(`SiteRelay is healthy (schema ${health.schemaVersion}).`);
} catch (error) {
  console.error(`SiteRelay is offline: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
}
