---
id: limitations
title: Known Limitations
sidebar_position: 6
---

# Known limitations

Said plainly, not smoothed over. Every item below was found during real testing against the live system, not guessed.

## Out-of-band SOP approval resumption has no shell tool access

This is the single most significant open gap found during testing. When a `supplier-payment` run parks at its human-approval checkpoint and is resumed via the CLI or the admin HTTP API (the intended, designed way to clear it), the resumed run's own step output reports: *"I don't have access to the shell tool... unable to execute the supplier validation script."*

The SOP behaves safely under this failure — it never fabricates a supplier resolution or a payment link, and correctly records the outcome as NÃO PROVOU with an honest reason. The custody/safety guarantee holds. The *availability* of the approval mechanism does not.

**Why this wasn't worked around by weakening the approval mode**: switching to a mode that allows in-chat approval would likely restore tool access, since the run would resume inside the original live session instead of a detached driver process. This was deliberately not done — `out_of_band_required` was chosen specifically because it makes the agent's own `sop_approve` call return a genuine denial rather than a no-op, which is exactly what prevents a prompt-injected or careless in-chat "yes" from ever clearing a fund-movement checkpoint. Weakening that to work around a tooling gap would trade a real security property for convenience — that's a product decision, not something to change silently.

**Practical impact**: every SOP in this product depends on the shell tool for its actual verification scripts. Any run that legitimately parks at an out-of-band checkpoint currently cannot complete through its own designed resumption mechanism. Recommended next step: file this against ZeroClaw upstream — the out-of-band resumption driver should inherit the same tool registry the run would have had inside its original session context, not a reduced one.

## The automatic recurring-pull cron job is disabled by default in the current deployment

The mechanism itself is fully proven (see [Real-world validation](/validation)) — real cron-triggered pulls, real cap enforcement, real multi-client rotation. But running it unattended, continuously, against a shared test environment isn't something to leave on without a real reason, so the current always-on deployment ships with this specific cron job disabled. Triggering a pull for a live demo currently needs a technical operator to run it manually. This is an operational choice, not a broken feature.

## A reply-delivery reliability gap (partially understood, not fully solved)

After a long, tool-heavy agent turn, the model's final reply synthesis to the chat channel intermittently returns an empty completion from the Anthropic API. When this happens, the channel delivers a generic fallback message instead of the actual confirmation. This was reproduced consistently across multiple real invoices on both WhatsApp and Telegram.

**What is and isn't affected**: the ledger state (FALOU/PROVOU/NÃO PROVOU) is always computed and recorded correctly — this property never broke, including through this bug. A direct follow-up question ("what's the status of invoice X?") always retrieves and reports the correct state. What can fail is only the *proactive* notification — a real deployment should not assume a client received a PROVOU message just because the underlying SOP run completed.

An attempted fix (pushing the final message via a different internal tool, bypassing conversational reply synthesis) was tried and found not to actually call the channel provider's send API — confirmed by trace inspection — so it was reverted. A deeper investigation (enabling full request-payload logging to check a specific hypothesis about how tool-result blocks are paired before the provider call) was attempted but blocked by a real capture gap in the available observability tooling — the raw message content never appeared in any inspectable trace, even with full logging enabled. This remains an open, honestly-unresolved gap, most likely requiring direct access to the ZeroClaw Rust source to fully diagnose.

## No technical enforcement of which shell command the agent may run, beyond the SOP's own instructions

The agent's shell tool is scoped by a general command allowlist (e.g., `node` is permitted broadly), not scoped to only the specific scripts each SOP names. Today's real gate against this is that the scripts themselves are the actual security boundary — allowlist checks and program-enforced caps live in the scripts, not in the agent's judgment about which command to run. This is low risk today, but is flagged as needing a harder gate (or a documented risk acceptance) before any less-trusted input reaches this SOP set.

## Model choice is safety-relevant, not just cost-relevant

Documented in full in [Security](/security#the-single-most-important-finding-of-this-project-a-model-swap-that-broke-the-golden-rule): a smaller model fabricated a complete fake PROVOU record with a plausible but non-existent signature. This is now mitigated structurally (an independent second verification step that any model's output must pass before PROVOU can be written), but it's disclosed here as a standing limitation of any LLM-driven verification system: the model itself is part of the trust boundary, and swapping it is a safety decision, not a routine configuration change.

## The Pix rail's third-party dependency is real, and one specific enforcement question remains untested

See the full threat model in [Security](/security#pix-rail--a-declared-third-party-trust-dependency). In short: whether the agent's filesystem sandbox would block a credential-file read attempt if the sensitive path were embedded inside a script string (rather than passed as a literal command-line argument) has not been directly tested — a live attack attempt against this specific mechanism never actually reached the shell call, so the question remains open rather than proven either way.

## Operational config-drift risks (mitigated by monitoring, not eliminated)

A few real, reproducible quirks were found in how this ZeroClaw build persists configuration, all now documented as operational runbook items rather than silently worked around:

- `sop.approval_mode` was once found silently reset to its default value partway through a session — the one config drift in this project that would silently reopen a safety hole (the agent regaining the ability to self-approve) rather than just breaking a feature. Operational rule: always re-read this value after any config change touching `[sop]`, never assume it stuck.
- Pausing a cron job that's also declared in `config.toml` is not durable — a daemon restart re-applies the config file's `enabled = true` over the paused database state. Fix: disable in both places.
- A SOP run can complete all of its steps successfully but not get marked terminal in the run store — because most SOPs have `max_concurrent = 1`, this alone is enough to permanently block every future attempt to trigger that SOP. Operational rule: if a SOP that should be idle refuses to start, check the run store for a stuck non-terminal row.

## Reproducibility is a path-substitution fix, not full automation

A helper script rewrites the hardcoded absolute install path across every config, SOP, and skill file in one pass — but this is honest path substitution, not full credential-provisioning automation. A stranger reproducing this project on a new machine still needs their own funded devnet keypairs and their own Anthropic/Telegram credentials; see [Reproducibility](/reproducibility) for exactly what is and isn't automated.
