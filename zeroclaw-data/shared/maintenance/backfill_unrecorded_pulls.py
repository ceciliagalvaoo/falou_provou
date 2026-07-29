#!/usr/bin/env python3
"""Reconciliation, part 2 of 2 (see find_unrecorded_pulls.mjs for part 1).

Takes the JSON array find_unrecorded_pulls.mjs prints (real, on-chain,
successful transfer_recurring pulls by our agent-puller key) on stdin,
checks each signature against the memory database for an existing record,
and backfills a PROVOU entry for any that landed on-chain but were never
recorded (the exact gap a bounty-judge-agent audit found, 2026-07-28:
a pull's SOP run reached the on-chain step successfully, then failed at
the memory_store step for an unrelated infrastructure reason, leaving
money moved with a silent ledger).

A backfilled record is NEVER indistinguishable from a normally-recorded
one - it carries "backfilled_by": "reconcile_subscription_pulls" and a
"backfilled_at" timestamp, so anyone reading it later (a human, or this
project's own future code) can always tell the difference between "the
SOP recorded this in the normal flow" and "a reconciliation sweep found
this after the fact." This still only ever writes PROVOU from an
independent on-chain fact (the signature genuinely landed, confirmed by
the caller script's own getTransaction check) - never from a document,
a memory, or an assumption. Same golden rule, applied to a gap nobody
had covered before.

Usage: python3 backfill_unrecorded_pulls.py
(runs find_unrecorded_pulls.mjs itself, as a subprocess with an explicit
argv list - not a shell string - so this single command is all a cron job
needs to invoke; "sh"/"bash" are deliberately not in
risk_profiles.core.allowed_commands, so a shell pipe between two separate
cron-invoked commands was never an option here anyway.)
"""
import sqlite3
import json
import sys
import uuid
import datetime
import subprocess

BRAIN_DB = "/mnt/c/Users/Inteli/Downloads/claim_chain/zeroclaw-data/data/memory/brain.db"
FINDER_SCRIPT = "/mnt/c/Users/Inteli/Downloads/claim_chain/zeroclaw-data/shared/maintenance/find_unrecorded_pulls.mjs"
AGENT_ID = "cfc5c198-1691-4de7-aeac-43cf5fa44871"  # the "dono" agent - same value every other subscription_pull_* memory row uses
MINT_DECIMALS = 6


def already_recorded(cur, signature):
    cur.execute("SELECT 1 FROM memories WHERE content LIKE ? LIMIT 1", (f"%{signature}%",))
    return cur.fetchone() is not None


def main():
    proc = subprocess.run(["node", FINDER_SCRIPT], capture_output=True, text=True, timeout=120)
    if proc.returncode != 0:
        print(f"find_unrecorded_pulls.mjs exited {proc.returncode}: {proc.stderr[:500]}", file=sys.stderr)
        return 1
    raw = proc.stdout
    try:
        candidates = json.loads(raw)
    except json.JSONDecodeError:
        print(f"Could not parse finder output as JSON: {raw[:200]}", file=sys.stderr)
        return 1

    if isinstance(candidates, dict) and "error" in candidates:
        print(f"find_unrecorded_pulls.mjs reported an error, not reconciling: {candidates['error']}", file=sys.stderr)
        return 1

    con = sqlite3.connect(BRAIN_DB)
    cur = con.cursor()

    backfilled = []
    for c in candidates:
        sig = c["signature"]
        if already_recorded(cur, sig):
            continue

        invoice_label = c["delegation_pda"][-5:]
        pull_amount = int(c["pull_amount"])
        pull_amount_usdc = pull_amount / (10 ** MINT_DECIMALS)
        now = datetime.datetime.now().astimezone().isoformat()

        content = json.dumps({
            "state": "PROVOU",
            "invoice_label": invoice_label,
            "delegation_pda": c["delegation_pda"],
            "delegator": c["delegator"],
            "pull_amount": str(pull_amount),
            "pull_amount_usdc": f"{pull_amount_usdc:g}",
            "signature": sig,
            "timestamp": c.get("block_time_iso") or now,
            "rail": "solana",
            "kind": "subscription_pull",
            "backfilled_by": "reconcile_subscription_pulls",
            "backfilled_at": now,
            "backfill_reason": "on-chain transfer_recurring landed but no memory_store record was ever written for it (found by find_unrecorded_pulls.mjs)",
        })

        key = f"subscription_pull_{invoice_label}_{sig[:12]}_backfilled"
        row_id = str(uuid.uuid4())

        cur.execute(
            """INSERT INTO memories
               (id, key, content, category, embedding, created_at, updated_at,
                session_id, namespace, importance, superseded_by, agent_id, kind, pinned, tenant_id)
               VALUES (?, ?, ?, 'daily', NULL, ?, ?, NULL, 'default', 0.5, NULL, ?, NULL, 0, NULL)""",
            (row_id, key, content, now, now, AGENT_ID),
        )
        backfilled.append((sig, c["delegation_pda"], pull_amount))

    con.commit()

    if backfilled:
        for sig, pda, amt in backfilled:
            print(f"Backfilled PROVOU: signature={sig} delegation={pda} amount={amt}")
    else:
        print("No unrecorded pulls found - nothing to backfill.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
