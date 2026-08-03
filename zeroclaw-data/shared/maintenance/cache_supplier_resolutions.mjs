// Fixes a real, verified limitation: `supplier-payment`'s out-of-band
// approval checkpoint (sop.approval_mode = "out_of_band_required") makes
// every parked run resume through a "headless SOP driver" context that
// has no `shell` tool access at all - confirmed 2026-07-29 via a real
// live run (see evidence/known-limitation-oob-approval-shell-2026-07-29.md).
// Step 1 of supplier-payment used to call resolve_supplier.mjs via shell,
// which made the entire SOP unable to complete after a real out-of-band
// approval. Steps 2/3/4 only ever use memory_recall/memory_store, both of
// which DO work in that same restricted context - confirmed directly -
// so moving step 1's work out of `shell` and into a pre-computed memory
// cache, read via memory_recall, removes the only shell dependency in the
// whole SOP without touching approval_mode or the checkpoint's own "the
// agent can never self-approve" guarantee at all.
//
// Runs as a plain shell-type cron job (no LLM/agent turn involved - same
// zero-cost pattern as the other maintenance scripts). Re-reads
// known-suppliers.json fresh every run, so adding/removing a supplier
// there is picked up automatically within one cycle.

import fs from "fs";
import { DatabaseSync } from "node:sqlite";

const SUPPLIERS_PATH = "/mnt/c/Users/Inteli/Downloads/claim_chain/zeroclaw-data/shared/known-suppliers.json";
const BRAIN_DB_PATH = "/mnt/c/Users/Inteli/Downloads/claim_chain/zeroclaw-data/data/memory/brain.db";
const DONO_AGENT_ID = "cfc5c198-1691-4de7-aeac-43cf5fa44871";

function main() {
  const suppliers = JSON.parse(fs.readFileSync(SUPPLIERS_PATH, "utf8"));
  const db = new DatabaseSync(BRAIN_DB_PATH);
  const now = new Date().toISOString();
  let written = 0;

  for (const supplier of suppliers) {
    const key = `supplier_cache_${supplier.key}`;
    const content = JSON.stringify({
      found: true,
      key: supplier.key,
      name: supplier.name,
      address: supplier.address,
      cached_at: now,
    });
    const existing = db.prepare("SELECT id FROM memories WHERE key = ?").get(key);
    if (existing) {
      db.prepare("UPDATE memories SET content = ?, updated_at = ? WHERE key = ?").run(content, now, key);
    } else {
      db.prepare(
        `INSERT INTO memories (id, key, content, category, embedding, created_at, updated_at, session_id, namespace, importance, superseded_by, agent_id, kind, pinned, tenant_id)
         VALUES (?, ?, ?, 'core', NULL, ?, ?, NULL, 'default', 0.9, NULL, ?, NULL, 1, NULL)`
      ).run(crypto.randomUUID(), key, content, now, now, DONO_AGENT_ID);
    }
    written++;
  }

  db.close();
  console.log(JSON.stringify({ ok: true, suppliers_cached: written }));
}

main();
