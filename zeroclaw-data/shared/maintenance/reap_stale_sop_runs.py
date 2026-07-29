#!/usr/bin/env python3
"""Reaps subscription-pull runs that stalled mid-flight (status "running",
no progress for longer than STALE_AFTER_MINUTES) so the one-client-per-tick
rotation doesn't stay blocked on that client forever.

Deliberately scoped to sop_name == "subscription-pull" AND status ==
"running" only - a supplier-payment run sitting at status "waiting_approval"
is a legitimate, possibly long, wait for genuine out-of-band human action
(see evidence/layer1-blinks.md) and must never be swept by a short timer.
Reaping the wrong kind of "not moving" run would turn a real safety gate
into a race against this script.

Runs as a plain shell-type cron job (no LLM/agent turn involved - this
project's whole reason for building it this way is that the reconciliation
and reaping logic must never depend on, or cost, an Anthropic API call).

Marks reaped rows terminal=1, status="cancelled" - never deleted, same
audit-trail-preserving pattern used every other time a stale run has been
found and patched by hand in this project (see
evidence/layer1-custody-paragraph.md's addenda). This script exists so that
no longer has to happen by hand.

Also deletes the run's row from `sop_claims` (a separate lease table the
engine uses to enforce each SOP's `max_concurrent` limit). Marking a run
terminal in `sop_runs` alone does NOT release its claim - found
(2026-07-29) as a real incident: a manually-terminated `invoice-watch` run
left an hour-long lease behind, so every subsequent `sop_execute` for that
SOP failed with "cooldown or concurrency limit reached" even though zero
non-terminal runs existed in `sop_runs`. Any code that force-terminates a
run outside the engine's own normal completion path must release both.

IMPORTANT: the status string MUST be one of the SOP engine's own valid
enum values (pending/running/waiting_approval/paused_checkpoint/completed/
failed/cancelled) - an earlier version of this script used "abandoned",
which is not a recognized variant. The engine's own startup "seed terminal
runs from store" step fails to deserialize any row with an invalid status,
which was found (2026-07-29) to break sop_execute for an unrelated SOP
entirely (cooldown/concurrency tracking got corrupted daemon-wide) - not
just silently skip that one row. Never invent a status string here; only
use one of the seven above.

Prints one line per reaped run, or "No stale runs found." if none.
"""
import sqlite3
import json
import sys
import datetime

RUNS_DB = "/mnt/c/Users/Inteli/Downloads/claim_chain/zeroclaw-data/data/sop/runs.db"
STALE_AFTER_MINUTES = 10
TARGET_SOP_NAME = "subscription-pull"
TARGET_STATUS = "running"


def main():
    con = sqlite3.connect(RUNS_DB)
    cur = con.cursor()
    cur.execute("SELECT run_id, last_progress_at, json FROM sop_runs WHERE terminal = 0")
    rows = cur.fetchall()

    now = datetime.datetime.now(datetime.timezone.utc)
    reaped = []

    for run_id, last_progress_at, j in rows:
        d = json.loads(j)
        run = d.get("run", {})

        if run.get("sop_name") != TARGET_SOP_NAME:
            continue
        if run.get("status") != TARGET_STATUS:
            continue

        try:
            ts = datetime.datetime.fromisoformat(last_progress_at.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            continue

        age_minutes = (now - ts).total_seconds() / 60
        if age_minutes < STALE_AFTER_MINUTES:
            continue

        run["status"] = "cancelled"
        run["completed_at"] = now.strftime("%Y-%m-%dT%H:%M:%SZ")
        d["run"] = run
        cur.execute("UPDATE sop_runs SET terminal = 1, json = ? WHERE run_id = ?", (json.dumps(d), run_id))
        cur.execute("DELETE FROM sop_claims WHERE run_id = ?", (run_id,))
        reaped.append((run_id, round(age_minutes, 1)))

    con.commit()

    if reaped:
        for run_id, age in reaped:
            print(f"Reaped stale run: {run_id} (stalled {age} min, sop={TARGET_SOP_NAME}, was status={TARGET_STATUS})")
    else:
        print("No stale runs found.")


if __name__ == "__main__":
    sys.exit(main())
