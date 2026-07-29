// Verification half of the Pix rail's FALOU -> PROVOU discipline (matching
// invoice-watch's own step 2 "validate, don't just detect" rule). Given a
// claimed amount (BRL) and how long ago it was claimed, reads the REAL
// account statement from Pluggy (v2/transactions - the old /transactions
// endpoint is deprecated, HTTP 410, confirmed empirically 2026-07-29) and
// looks for a matching credit (incoming) transaction.
//
// Matches by amount + a time window, not by a "Pix" label or payment
// method field: the stable "Pluggy Bank" sandbox connector's synthetic
// data does not generate any Pix-labeled transactions at all (confirmed
// empirically - its fixed dataset is boletos/utility bills/salary only),
// and real bank statement descriptions for Pix vary too much to rely on
// text matching being universal in production either. Amount + timing is
// the same fundamentally sound approach a human doing manual
// reconciliation uses.
//
// Prints one JSON object: {"found","transaction_id","amount","date","description"}
// or {"found":false}. A false result is NAO_PROVOU, never silently retried
// into a false PROVOU.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getApiKey } from "./pluggy_client.mjs";
import { DatabaseSync } from "node:sqlite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = "https://api.pluggy.ai";
const AMOUNT_TOLERANCE = 0.01; // BRL, absorbs float rounding only - not a fuzzy match
const DEFAULT_WINDOW_DAYS = 7;
const BRAIN_DB_PATH = path.resolve(__dirname, "../../zeroclaw-data/data/memory/brain.db");

// A transaction already used as PROVOU proof for a different claim must
// never be reused to prove a second, distinct claim of the same amount -
// that would silently double-count the ledger. Same dedup rule as the
// agent-facing wrapper (check_pix_claim.mjs).
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
        // malformed row content - ignore
      }
    }
    return ids;
  } finally {
    db.close();
  }
}

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

async function main() {
  const accountId = arg("account-id");
  const claimedAmount = parseFloat(arg("amount"));
  const sinceIso = arg("since", false); // e.g. claim timestamp; only transactions on/after this count
  const windowDays = parseFloat(arg("window-days", false)) || DEFAULT_WINDOW_DAYS;

  const consumed = alreadyConsumedTransactionIds();
  const transactions = await listTransactionsV2(accountId);
  const windowEnd = sinceIso ? new Date(new Date(sinceIso).getTime() + windowDays * 86400000) : null;

  const match = transactions.find((t) => {
    if (t.amount <= 0) return false; // Pix RECEIVED is a credit (positive) - never match a debit against an incoming claim
    if (Math.abs(t.amount - claimedAmount) > AMOUNT_TOLERANCE) return false;
    if (sinceIso && new Date(t.date) < new Date(sinceIso)) return false;
    if (windowEnd && new Date(t.date) > windowEnd) return false;
    if (consumed.has(t.id)) return false;
    return true;
  });

  if (match) {
    console.log(JSON.stringify({
      found: true,
      transaction_id: match.id,
      amount: match.amount,
      date: match.date,
      description: match.description,
    }));
  } else {
    console.log(JSON.stringify({ found: false }));
  }
}

main().catch((err) => {
  console.log(JSON.stringify({ found: false, error: err.message }));
  process.exit(1);
});
