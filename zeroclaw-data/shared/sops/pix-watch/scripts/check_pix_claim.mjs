// Agent-facing wrapper around pix-rail/scripts/pix_watch.mjs. Lives inside
// risk_profiles.core.allowed_roots so the agent's shell tool can run it;
// the actual Pluggy CLIENT_ID/CLIENT_SECRET (pix-rail/.env) stay outside
// that boundary and are only ever read by pluggy_client.mjs, imported here
// by absolute path - same "secret lives outside the agent's reach, only a
// script it invokes touches it" pattern as the agent-puller Solana key
// (see execute_pull.mjs and the prompt-injection fix documented in
// evidence/prompt-injection-subscription-and-supplier-2026-07-28.md).
//
// Prints one JSON object: {"found","transaction_id","amount","date","description"}
// or {"found":false}. On an internal error (network/API failure - NOT a
// clean "checked, no match" result) also includes an "error" key so the
// caller (pix-watch/SOP.md step 2) can tell the two apart: a clean
// found:false means the statement was actually read and nothing matched
// (safe to write NAO_PROVOU); an error means verification could not run
// at all (must NOT be written as NAO_PROVOU - that would overclaim a
// denial the source never actually gave; see
// evidence/pix-rail-2026-07-29.md's bugfix section for the real incident
// that motivated this distinction).

import { getApiKey } from "/mnt/c/Users/Inteli/Downloads/claim_chain/pix-rail/scripts/pluggy_client.mjs";
import { DatabaseSync } from "node:sqlite";

const BASE_URL = "https://api.pluggy.ai";
const AMOUNT_TOLERANCE = 0.01;
const DEFAULT_WINDOW_DAYS = 7;
const BRAIN_DB_PATH = "/mnt/c/Users/Inteli/Downloads/claim_chain/zeroclaw-data/data/memory/brain.db";

function arg(name, required = true) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || !process.argv[idx + 1]) {
    if (required) throw new Error(`missing --${name}`);
    return null;
  }
  return process.argv[idx + 1];
}

async function listTransactionsV2(accountId) {
  // v2/transactions rejects a "from" query param ("property from should
  // not exist" - 400, confirmed empirically 2026-07-29, despite some docs
  // examples showing it). Date filtering is done client-side below against
  // each transaction's own `date` field instead.
  const apiKey = await getApiKey();
  const params = new URLSearchParams({ accountId });
  const res = await fetch(`${BASE_URL}/v2/transactions?${params}`, { headers: { "X-API-KEY": apiKey } });
  if (!res.ok) throw new Error(`v2/transactions failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.results || [];
}

// A transaction that has already been used as PROVOU proof for a
// different claim must never be reused to prove a second, distinct
// claim of the same amount - that would silently double-count the
// ledger. Read-only query against the shared memory DB (no write, no
// lock contention risk with the live agent).
function alreadyConsumedTransactionIds() {
  const db = new DatabaseSync(BRAIN_DB_PATH, { readOnly: true });
  try {
    const rows = db.prepare(
      "SELECT content FROM memories WHERE key LIKE 'pix_%_verification'"
    ).all();
    const ids = new Set();
    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.content);
        if (parsed.state === "PROVOU" && parsed.transaction_id) ids.add(parsed.transaction_id);
      } catch {
        // malformed row content - ignore, don't let it block verification
      }
    }
    return ids;
  } finally {
    db.close();
  }
}

async function main() {
  const accountId = arg("account-id");
  const claimedAmount = parseFloat(arg("amount"));
  const sinceIso = arg("since", false);
  const windowDays = parseFloat(arg("window-days", false)) || DEFAULT_WINDOW_DAYS;

  const consumed = alreadyConsumedTransactionIds();
  const transactions = await listTransactionsV2(accountId);

  const windowEnd = sinceIso ? new Date(new Date(sinceIso).getTime() + windowDays * 86400000) : null;

  const match = transactions.find((t) => {
    if (t.amount <= 0) return false;
    if (Math.abs(t.amount - claimedAmount) > AMOUNT_TOLERANCE) return false;
    if (sinceIso && new Date(t.date) < new Date(sinceIso)) return false;
    if (windowEnd && new Date(t.date) > windowEnd) return false;
    if (consumed.has(t.id)) return false; // already proved a different claim - not eligible again
    return true;
  });

  if (match) {
    console.log(JSON.stringify({
      found: true, transaction_id: match.id, amount: match.amount,
      date: match.date, description: match.description,
    }));
  } else {
    console.log(JSON.stringify({ found: false }));
  }
}

main().catch((err) => {
  console.log(JSON.stringify({ found: false, error: err.message }));
  process.exit(1);
});
