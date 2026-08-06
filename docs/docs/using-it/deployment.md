---
title: Deployment
---

# Deployment

This product runs 24/7 on a real, publicly-reachable server — not just on a developer's laptop during a demo. This page documents exactly how and where.

## Where it runs

A free-tier Oracle Cloud Infrastructure (OCI) VM (`VM.Standard.E2.1.Micro`, Oracle Linux 9), always on. Both Telegram bots (`dono` and `contador`) are reachable at any time, and the recurring/reconciliation maintenance jobs run continuously via `cron`, not just during a manual test session.

## What's running on the VM

- **The ZeroClaw daemon** — a `systemd` service, running the agent runtime continuously, handling both Telegram bots and the cron scheduler for all maintenance jobs.
- **The Actions/Blinks server** — a second `systemd` service, serving the real Solana Actions HTTP endpoints (`authorize-subscription`, `pay-supplier`) that wallets connect to when a client or supplier opens a shared link.
- **Caddy**, acting as a reverse proxy in front of the Actions server, terminating real, trusted HTTPS.

Both services are enabled and configured to restart automatically; SELinux runs in enforcing mode (Oracle Linux's default), which required a real, non-obvious fix during setup (see below).

## Public HTTPS, without a purchased domain

The Actions server needs to be reachable over real HTTPS for wallets to trust the links it serves — `localhost` is not enough for a live product. This deployment uses a deliberate, documented choice rather than a shortcut:

- **[nip.io](https://nip.io)**, a free wildcard DNS service that resolves `<ip-with-dashes>.nip.io` directly to that IP, with zero registration or waiting.
- **Caddy**, which automatically obtains a real Let's Encrypt certificate for any domain it can prove control of via the standard HTTP-01 challenge.

Together, this gives genuine, browser-trusted HTTPS at zero cost, with no DNS propagation delay. A real custom domain remains a possible, straightforward future upgrade — this was a considered choice for the bounty timeline, not a technical limitation.

## A real, non-obvious deployment bug: SELinux blocking a systemd-launched binary

The first attempt at the `systemd` service for the daemon failed with `status=203/EXEC` — "Permission denied" — even though the binary's own file permissions were correct and running it manually from an interactive shell worked fine. This pointed away from a simple POSIX permission issue.

The real cause, confirmed via `ausearch -m avc`: a genuine SELinux AVC denial. `systemd`-launched processes run in the `init_t` security domain, which is not permitted to `execute` a binary carrying the default `user_home_t` label — the label anything under a user's home directory gets by default on Oracle Linux, which enforces SELinux out of the box. This is an OS-level access-control layer entirely separate from standard Unix file permissions, and it silently blocks exactly this kind of "the file looks executable but systemd still can't run it" case.

Fixed with a persistent relabel: `semanage fcontext -a -t bin_t <path>` followed by `restorecon -v <path>` — this survives future file replacements (e.g., redeploying a new build of the binary) because it's a rule tied to the path, not a one-off label on the current file.

## Keeping the VM in sync with the repository

The VM's checkout is kept up to date with `git pull` against the main branch. One real, repeatable wrinkle: a path-rewriting script (see [Reproducibility](/docs/using-it/reproducibility)) permanently bakes the VM's own absolute install path into tracked config/SOP/skill files, since there's no runtime templating layer for these paths. Pulling a new commit that touches an already-rewritten file causes a local conflict. The established, repeatable fix: discard the local rewritten version (safe, since it's fully regeneratable), pull, then re-run the path-rewrite script.

## What's deliberately not done yet

- The Pix rail's Pluggy bank connection runs in sandbox mode on the VM, same as local development — a deliberate, disclosed choice (see [Security](/docs/how-it-works/security#pix-rail--a-declared-third-party-trust-dependency)), not a shortcut taken under time pressure.
- The automatic recurring-pull cron job ships disabled by default on this deployment (see [Known limitations](/docs/evidence/bugs-found)) — the mechanism itself is fully proven, but running it unattended continuously against shared test infrastructure isn't turned on without a specific reason.
- The Actions server's mainnet configuration (it supports mainnet via environment variables, and the mainnet mechanism itself is proven — see [Real-world validation](/docs/evidence/validation)) is not what's live on the always-on deployment today, which runs devnet-configured.
