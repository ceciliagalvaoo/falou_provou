---
title: Reproducibility
---

# Reproducibility

An honest account of how far this project goes to let someone else reproduce it on their own machine, what's automated, and what genuinely still requires manual setup.

## The problem this addresses

An early independent audit scored reproducibility poorly: the project's absolute install path was hardcoded directly into the daemon's config file, every SOP's shell-tool instructions, every skill's script references, and the standalone test scripts. A stranger cloning the repository elsewhere would have had to manually hunt down and edit every one of those files by hand before anything would run.

## The fix: `tooling/rewrite-install-path.sh`

A single script takes a new absolute project root and rewrites every occurrence of the old path across every `config.toml`, `SOP.toml`/`SOP.md`, `SKILL.md`, and `.mjs`/`.py` script that references it, excluding `node_modules/` (irrelevant) and `evidence/` (a historical record of what happened on the original machine, which must not be silently rewritten to look like it happened somewhere else).

It also handles a real, non-obvious quirk: a running daemon's cron job prompts are stored in a database, not just in `config.toml`: and the two can genuinely diverge, because `config.toml`'s declarative cron entries only sync into the database on that machine's very first-ever daemon start against an empty database. Editing `config.toml` alone after that point does not update an already-provisioned install. The script rewrites the database copy too, on an existing install; a fresh clone has no such database yet, so it's skipped cleanly and the daemon's first start seeds it correctly from the now-rewritten config.

This was verified against an isolated fixture (not the live project, to avoid breaking a working setup mid-test): a config file, a SOP file, and a database each containing the old path, all correctly rewritten and verified by reading them back afterward.

## What this does and doesn't solve

**Solved**: reproducing this project on a new machine now takes *"clone, run one script with your target path, continue setup"* instead of *"clone, manually find and edit N files by hand."*

**Not solved, and not claimed to be**: this is a path-substitution tool, not full location-independence. The config, SOP, and skill files are static text ZeroClaw parses directly, there's no runtime templating layer that resolves paths dynamically, so an absolute path is unavoidable somewhere in these files by construction. Separately, and left as genuinely manual steps for good reason (these involve real secrets and real accounts that shouldn't be automated into a script):

- A stranger needs their own funded Solana devnet keypairs (client, merchant, agent-puller).
- Their own Anthropic API key.
- Their own Telegram bot tokens, created via `@BotFather`.
- Their own Pluggy sandbox credentials, if reproducing the Pix rail.

## Steps to reproduce, end to end

1. Clone the repository.
2. Run `tooling/rewrite-install-path.sh <your-absolute-project-root>`.
3. Provide your own Solana devnet keypairs, funded via the devnet faucet.
4. Provide your own Anthropic API key in the ZeroClaw config.
5. Create your own Telegram bot(s) via `@BotFather` and bind them.
6. (Optional, for the Pix rail) Provide your own Pluggy sandbox `CLIENT_ID`/`CLIENT_SECRET` in `pix-rail/.env`.
7. Start the daemon (`zeroclaw daemon`) and the Actions server (`node tooling/actions-server/server.mjs`).

This mirrors exactly the steps this project's own deployment onto a fresh Oracle Cloud VM followed, see [Deployment](/docs/using-it/deployment) for what that looked like in practice, including a real SELinux fix that isn't part of this script (it's an OS-level concern, not a project-file path issue).
