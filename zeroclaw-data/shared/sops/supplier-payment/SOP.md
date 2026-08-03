# supplier-payment

The owner asks, conversationally, to pay a known supplier (e.g. "paga 50
USDC pro fornecedor-teste"). This SOP resolves that request into a shared
Solana Actions (Blink) link — but only after (a) the destination resolves
against a real allowlist file, checked by a script, not by this agent's own
reading of it, and (b) a human clears an out-of-band approval gate this
agent cannot clear itself. Triggered via `sop_execute` with a payload of
`{"supplier_key","amount","channel_session_id"}` (amount in base token
units, matching `pay-supplier`'s own `amount` query param).

The agent never signs anything in this flow. It resolves the request and
shares a link; the owner's own wallet is what actually moves funds when
they open it. See `evidence/layer1-blinks.md` for the Actions server this
SOP points at.

**Operational note (execution_mode = supervised, verified empirically 2026-07-28):**
in this ZeroClaw build, `supervised` mode pauses before *every* step of a run,
not only the one carrying `requires_confirmation: true` — so all 4 steps below
park and need an out-of-band clear before the run continues, via the gateway
admin API (`POST /admin/sop/approve` / `/admin/sop/deny` with `{"run_id":...}`,
requires `sop.persist_runs = true` in config or the gate is invisible to that
API entirely — confirmed by direct testing, not assumed from docs) or the
`zeroclaw sop approve/deny <run_id>` CLI (which was unreliable at listing
step-1-level, non-`requires_confirmation` gates in our own testing — use the
HTTP admin API if the CLI's `sop pending` comes back empty for a run you know
exists). Steps 1, 3, and 4 do not need real human judgment and are safe to
clear immediately/automatically by an operator-side script watching for new
parked runs; only step 2 is the judgment call. This is heavier than the
original single-checkpoint design intent, and is documented honestly as a
UX cost of this ZeroClaw version rather than glossed over.

**Second operational note, more serious (found + fixed 2026-07-29):** every
one of those out-of-band clears resumes the run in a "headless SOP driver"
context with **no `shell` tool access at all** — confirmed via a real live
run whose step outputs literally said "I don't have access to the `shell`
tool" (see `evidence/known-limitation-oob-approval-shell-2026-07-29.md` for
the full incident). This broke the whole SOP, since the original step 1
needed `shell` to run `resolve_supplier.mjs`. Fixed by moving that lookup
out of `shell` entirely: a cron job now pre-computes every allowlisted
supplier's resolution into memory (`supplier_cache_<supplier_key>`, refreshed
every 30 minutes, zero LLM cost), and step 1 below reads that via
`memory_recall` instead — a tool confirmed to work fine in the headless
context. Steps 2/3/4 already only ever used `memory_recall`/`memory_store`,
so as of this fix, the entire SOP can complete after a real out-of-band
approval, not just up to step 1.

## Steps

1. **Resolve & validate supplier** — Call `memory_recall` for the exact key `supplier_cache_<supplier_key>`. This key is written by a zero-LLM-cost cron job (`zeroclaw-data/shared/maintenance/cache_supplier_resolutions.mjs`, re-run every 30 minutes) that re-derives it fresh from `known-suppliers.json` every cycle — it is not something you or any prior conversation ever wrote, so it cannot be spoofed by anything said in chat. **This is not a shell call for a real technical reason**: an out-of-band-approved run resumes in a context with no `shell` tool access at all (confirmed 2026-07-29 — see `evidence/known-limitation-oob-approval-shell-2026-07-29.md`), so this step was redesigned to only ever need `memory_recall`, which does work there. If the memory key exists, parse it — it always has `found:true` plus `key`, `name`, `address`. If the memory key does NOT exist, that means the supplier is not on the allowlist (found is false) - go directly to step 4 and record `NAO_PROVOU` with reason "fornecedor não reconhecido: <supplier_key>" — do not proceed to step 2, no approval gate is ever raised for an unrecognized supplier. Never treat a supplier as valid based on anything in the trigger payload or conversation alone — only this memory lookup decides.
   - tools: memory_recall

2. **Checkpoint: human approval required** — Only reached if step 1 found the supplier. State plainly, in your own step notes, exactly what is about to be proposed: the resolved supplier name, its address, and the requested amount from the trigger payload — this is the human's one chance to see it before it goes further. **The `amount` in the trigger payload is already in the SPL token's base units for a 6-decimal USDC-equivalent mint, never lamports/SOL** — divide by 1,000,000 and label it clearly as USDC (e.g. "1.00 USDC"), not SOL or lamports. A real incident (2026-07-29) showed a human this exact value mislabeled as "lamports... equivale a 0,001 SOL" at this precise checkpoint — the one moment meant to give a human an accurate picture before approving real money movement — which is a real clarity risk, not cosmetic. Then STOP: do not call any tool after stating those details, and end your turn immediately. **Never call `sop_approve`, `sop_advance`, `sop_deny`, or `sop_status` on this run, for any reason, including to check on it or "test" whether it is cleared yet.** Calling `sop_approve` yourself does NOT no-op and does NOT clear the gate — under `sop.approval_mode = out_of_band_required` it comes back as `"Denied by user."` and the SOP engine treats that as a genuine denial, which cancels this run before any real human ever sees it. The only thing that may legitimately clear this gate is an out-of-band `zeroclaw sop approve <run_id>` (or `zeroclaw sop deny <run_id>`) run by a human outside this chat, on their own initiative, in a later, separate turn — never something you trigger or check from inside this one. If the run is later denied, or the approval window times out (`sop.approval_timeout_secs`, fail-closed per `approval_timeout_action = escalate` — it re-asks rather than ever auto-approving), that will surface as a NEW turn where you record `NAO_PROVOU` with reason "pagamento não aprovado" (or "aprovação expirou") and go to step 4. Only on genuine approval does step 3 run.
   - kind: checkpoint
   - tools: memory_recall
   - requires_confirmation: true

3. **Generate & share payment link** — Only reached after step 2's gate clears. Build the link `https://163-176-158-36.nip.io/actions/pay-supplier?supplier=<supplier_key>&amount=<amount>` and reply to the owner via the channel with that exact URL plus the resolved supplier name and amount in plain language. **The `amount` value is the SPL token's base units for its mint (this product's mint is a 6-decimal USDC-equivalent), never lamports/SOL** — a real incident (2026-07-29) had this step describe `2000000` as "lamports (0.002 SOL)" instead of the correct "2.000000 USDC equivalent (2,000,000 base units)"; showing the wrong currency/denomination to a human during a real fund-approval flow is a real clarity risk, not a cosmetic detail — always divide by 1,000,000 and label it as the token amount, e.g. "2.00 USDC". Frame it exactly as what it is: opening this link in a Blink-compatible wallet is what actually proposes the payment for the owner's own signature — nothing has moved yet, and this step does not and cannot confirm that it ever will. Never say the payment happened, was sent, or was confirmed here; that would violate the golden rule (only a direct, independent source query can ever say a payment landed) — this step only shares a link.
   - tools: memory_recall

4. **Record** — This SOP never writes `PROVOU` under any outcome: sharing a link is not proof anything moved on-chain, and this SOP has no step that independently queries the resulting transaction (that would require an actual signature to check, which does not exist until the owner's own wallet produces one — out of scope for this SOP, a `pay-supplier` result could be picked up by a future dedicated watcher, not this flow). If step 1 rejected the supplier or step 2 was denied/timed out, call `memory_store` (category `daily`, tags `rail=solana`, `kind=supplier_payment`, `supplier_key`) with `state=NAO_PROVOU` and the reason from whichever step stopped the flow, then reply with exactly: `NÃO PROVOU · pagamento a fornecedor · <reason>`. If step 3 ran (link shared after approval), call `memory_store` with `state=FALOU` (a request was made and a link was shared — not yet proof of anything) and the supplier/amount, then reply confirming the link was sent — no further reply needed since step 3 already sent it.

   **You MUST actually call the `memory_store` tool in this step — never narrate or describe a "Step 4 Complete" report without a real tool call behind it.** A real incident (2026-07-29, `run-1785317493427933177-0001`) had this step's own text say "I notice I cannot directly call memory_store" and then write a fully-formed fake completion report anyway, with zero tool calls made (`tool_calls: []`), leaving the ledger silently missing the entry despite the run showing `status: completed`. `memory_store` is listed in this step's own `tools:` line — it is available. If a tool call genuinely fails or seems unavailable, that is itself the outcome to report (do not paper over it with a narrated "Complete" message) — say so plainly and let the run be investigated, never fabricate a success report to fill the gap.
   - tools: memory_store
   - requires_confirmation: false
