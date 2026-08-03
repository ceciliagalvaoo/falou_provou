#!/usr/bin/env python3
"""Backfills supplier-payment ledger entries the SOP itself failed to
record.

Real, confirmed incident (2026-07-29, twice in a row): `supplier-payment`
SOP.md step 4 instructs the agent to call `memory_store` after a link is
shared, and even after a strong instruction rewrite explicitly forbidding
narrating a fake "Complete" report without a real tool call, the model
still did exactly that both times - its own step output said "Registro
armazenado" while zero tool calls actually fired
(step_results[3]["tool_calls"] absent/empty, and no
`supplier_payment_<run_id>` key ever appeared in brain.db). This is not
something more SOP.md wording reliably fixes in this execution context
(the out-of-band "headless SOP driver" resume path - see
evidence/known-limitation-oob-approval-shell-2026-07-29.md for the related
shell-tool gap), so the ledger's completeness is made deterministic
instead of depending on the LLM self-reporting correctly.

Runs as a plain shell-type cron job (no LLM/agent turn involved - same
zero-cost pattern as the other maintenance scripts). Scans every
COMPLETED supplier-payment run in runs.db; for any whose step 3 shows a
link was actually shared but no matching `supplier_payment_<run_id>` key
exists in brain.db, backfills one directly from the run's own real step
data (supplier_key/amount/link, taken from the trigger payload and step 3's
output - never invented), marked `state=FALOU` (never PROVOU - sharing a
link is still not proof anything moved, same rule the SOP itself follows)
and explicitly tagged as backfilled so it is never indistinguishable from
a normally-recorded entry.
"""
import sqlite3
import json
import sys
import re
import uuid
from datetime import datetime, timezone

RUNS_DB = "/mnt/c/Users/Inteli/Downloads/claim_chain/zeroclaw-data/data/sop/runs.db"
BRAIN_DB = "/mnt/c/Users/Inteli/Downloads/claim_chain/zeroclaw-data/data/memory/brain.db"
DONO_AGENT_ID = "cfc5c198-1691-4de7-aeac-43cf5fa44871"
TARGET_SOP_NAME = "supplier-payment"


def main():
    runs_con = sqlite3.connect(RUNS_DB)
    runs_cur = runs_con.cursor()
    runs_cur.execute("SELECT run_id, json FROM sop_runs WHERE terminal = 1")
    rows = runs_cur.fetchall()
    runs_con.close()

    brain_con = sqlite3.connect(BRAIN_DB)
    brain_cur = brain_con.cursor()
    now = datetime.now(timezone.utc).isoformat()
    backfilled = []

    for run_id, j in rows:
        d = json.loads(j)
        run = d.get("run", {})
        if run.get("sop_name") != TARGET_SOP_NAME:
            continue
        if run.get("status") != "completed":
            continue

        ledger_key = f"supplier_payment_{run_id}"
        existing = brain_cur.execute("SELECT id FROM memories WHERE key = ?", (ledger_key,)).fetchone()
        if existing:
            continue  # already recorded, nothing to do

        step_results = run.get("step_results", [])
        step3 = next((s for s in step_results if s.get("step_number") == 3), None)
        if not step3:
            continue  # never reached link-sharing, nothing to backfill (correctly stayed unrecorded)

        link_match = re.search(r"http://localhost:8787/actions/pay-supplier\?supplier=([^&\s`]+)&amount=(\d+)", step3.get("output", ""))
        if not link_match:
            continue  # can't extract real data, skip rather than guess

        supplier_key, amount = link_match.group(1), link_match.group(2)

        try:
            payload = json.loads(run.get("trigger_event", {}).get("payload", "{}"))
        except (json.JSONDecodeError, TypeError):
            payload = {}

        content = json.dumps({
            "state": "FALOU",
            "supplier_key": supplier_key,
            "amount": amount,
            "link": f"http://localhost:8787/actions/pay-supplier?supplier={supplier_key}&amount={amount}",
            "channel_session_id": payload.get("channel_session_id"),
            "rail": "solana",
            "kind": "supplier_payment",
            "backfilled_by": "reconcile_supplier_payments.py - SOP step 4 completed without calling memory_store",
            "backfilled_at": now,
        })

        brain_cur.execute(
            """INSERT INTO memories (id, key, content, category, embedding, created_at, updated_at, session_id, namespace, importance, superseded_by, agent_id, kind, pinned, tenant_id)
               VALUES (?, ?, ?, 'daily', NULL, ?, ?, NULL, 'default', 0.5, NULL, ?, NULL, 0, NULL)""",
            (str(uuid.uuid4()), ledger_key, content, now, now, DONO_AGENT_ID),
        )
        backfilled.append(run_id)

    brain_con.commit()
    brain_con.close()

    if backfilled:
        for run_id in backfilled:
            print(f"Backfilled supplier_payment_{run_id}")
    else:
        print("No unrecorded supplier-payment completions found.")


if __name__ == "__main__":
    sys.exit(main())
