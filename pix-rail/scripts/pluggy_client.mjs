// Minimal Pluggy API client - no SDK dependency, plain fetch, matching this
// project's existing style (see tooling/actions-server/server.mjs). Caches
// the derived apiKey in memory for its ~2h lifetime rather than
// re-authenticating on every call - CLIENT_ID/CLIENT_SECRET are the real
// long-lived secret, the apiKey is just a short-lived derived token.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  const raw = fs.readFileSync(envPath, "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = loadEnv();
const CLIENT_ID = env.PLUGGY_CLIENT_ID;
const CLIENT_SECRET = env.PLUGGY_CLIENT_SECRET;
const BASE_URL = "https://api.pluggy.ai";

let cachedApiKey = null;
let cachedApiKeyExpiresAt = 0;

export async function getApiKey() {
  if (cachedApiKey && Date.now() < cachedApiKeyExpiresAt) return cachedApiKey;
  const res = await fetch(`${BASE_URL}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET }),
  });
  if (!res.ok) throw new Error(`Pluggy auth failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  cachedApiKey = data.apiKey;
  // Real expiry is 2h; refresh a bit early (100 min) to never hand out a
  // key that expires mid-request.
  cachedApiKeyExpiresAt = Date.now() + 100 * 60 * 1000;
  return cachedApiKey;
}

export async function createConnectToken(options = {}) {
  const apiKey = await getApiKey();
  const res = await fetch(`${BASE_URL}/connect_token`, {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ options }),
  });
  if (!res.ok) throw new Error(`connect_token failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.accessToken;
}

export async function getItem(itemId) {
  const apiKey = await getApiKey();
  const res = await fetch(`${BASE_URL}/items/${itemId}`, { headers: { "X-API-KEY": apiKey } });
  if (!res.ok) throw new Error(`getItem failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function listAccounts(itemId) {
  const apiKey = await getApiKey();
  const res = await fetch(`${BASE_URL}/accounts?itemId=${itemId}`, { headers: { "X-API-KEY": apiKey } });
  if (!res.ok) throw new Error(`listAccounts failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.results || [];
}

export async function listTransactions(accountId, { from, to } = {}) {
  const apiKey = await getApiKey();
  const params = new URLSearchParams({ accountId, pageSize: "500" });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const res = await fetch(`${BASE_URL}/transactions?${params}`, { headers: { "X-API-KEY": apiKey } });
  if (!res.ok) throw new Error(`listTransactions failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.results || [];
}
