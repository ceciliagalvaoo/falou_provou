#!/usr/bin/env bash
# Reproducibility fix, 2026-07-28: an independent bounty-judge-agent audit
# found this project's absolute install path
# (/mnt/c/Users/Inteli/Downloads/claim_chain) hardcoded directly into
# config.toml's cron job prompt, every SOP.md's shell-tool instructions,
# every SKILL.md's script references, and the standalone test scripts under
# tooling/ - a stranger following the write-up could not stand this up on
# their own machine without manually hunting down and editing every one of
# those files by hand. Scored reproducibility 3/10 for exactly this reason.
#
# This script does that substitution for them, once, across every file that
# actually needs it (deliberately excluding evidence/*.md - those are a
# historical record of what happened on THIS machine and must not be
# rewritten) - plus the cron job's prompt as currently stored in
# zeroclaw-data/data/cron/jobs.db, which is the one that actually runs
# (config.toml's declarative cron entries only sync into that database on
# a machine's very first-ever daemon start with an empty jobs.db - a real,
# separately-documented ZeroClaw quirk, see evidence/layer1-custody-paragraph.md;
# editing config.toml alone would NOT update an already-running install).
#
# Usage:
#   tooling/rewrite-install-path.sh <new_absolute_project_root> [old_path]
#
# Example (fresh clone to /home/alice/claim_chain):
#   tooling/rewrite-install-path.sh /home/alice/claim_chain
#
# Run this BEFORE the first `zeroclaw daemon` start on a new machine - once
# jobs.db has been created with the old path baked in, this script's DB
# rewrite step still fixes it, but any daemon that already ran cron ticks
# against the stale path will have logged failures in the meantime.

set -euo pipefail

NEW_PATH="${1:?Usage: $0 <new_absolute_project_root> [old_path]}"
OLD_PATH="${2:-/mnt/c/Users/Inteli/Downloads/claim_chain}"

if [ "$NEW_PATH" = "$OLD_PATH" ]; then
  echo "New path is identical to old path - nothing to do."
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Rewriting '$OLD_PATH' -> '$NEW_PATH'"
echo "Project root: $PROJECT_ROOT"
echo

# 1. Text files: config.toml, every SOP.toml/SOP.md, every SKILL.md, every
#    .mjs/.py script - excluding node_modules (huge, irrelevant, and some
#    packages' own docs contain unrelated paths that must not be touched)
#    and evidence/ (historical record, not live config).
FILES=$(grep -rl "$OLD_PATH" \
  --include="*.toml" --include="*.md" --include="*.mjs" --include="*.py" \
  "$PROJECT_ROOT" 2>/dev/null \
  | grep -v "/node_modules/" \
  | grep -v "/evidence/" \
  || true)

if [ -z "$FILES" ]; then
  echo "No text files contain the old path."
else
  echo "$FILES" | while IFS= read -r f; do
    sed -i "s|$OLD_PATH|$NEW_PATH|g" "$f"
    echo "  updated: ${f#$PROJECT_ROOT/}"
  done
fi

# 2. The live cron job prompt in jobs.db, if it exists (a fresh clone
#    won't have this file yet - that's fine, config.toml's declarative
#    entry (already rewritten above) will be correct on first daemon
#    start, matching the "empty jobs.db syncs from config.toml" behavior).
JOBS_DB="$PROJECT_ROOT/zeroclaw-data/data/cron/jobs.db"
if [ -f "$JOBS_DB" ]; then
  python3 - "$JOBS_DB" "$OLD_PATH" "$NEW_PATH" <<'PYEOF'
import sqlite3, sys
db_path, old, new = sys.argv[1], sys.argv[2], sys.argv[3]
con = sqlite3.connect(db_path)
cur = con.cursor()
cur.execute("SELECT id, prompt, command FROM cron_jobs")
rows = cur.fetchall()
changed = 0
for job_id, prompt, command in rows:
    new_prompt = prompt.replace(old, new) if prompt else prompt
    new_command = command.replace(old, new) if command else command
    if new_prompt != prompt or new_command != command:
        cur.execute("UPDATE cron_jobs SET prompt = ?, command = ? WHERE id = ?", (new_prompt, new_command, job_id))
        changed += 1
con.commit()
print(f"  updated {changed} cron job row(s) in jobs.db")
PYEOF
else
  echo "  (no jobs.db yet - nothing to update there; config.toml's declarative cron entry will seed it correctly on first daemon start)"
fi

echo
echo "Done. Re-run 'zeroclaw sop validate' and 'zeroclaw skills audit <name>' for each skill to confirm nothing broke."
