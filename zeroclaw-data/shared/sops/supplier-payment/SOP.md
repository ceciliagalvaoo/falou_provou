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

## Steps

1. **Resolve & validate supplier** — Run this exact absolute path via the shell tool, do not search for it: `node /mnt/c/Users/Inteli/Downloads/claim_chain/zeroclaw-data/shared/sops/supplier-payment/scripts/resolve_supplier.mjs --supplier-key <supplier_key>`. It prints `{"found":true,"key","name","address"}` and exits 0 if the key is on the allowlist, or `{"found":false,...}` and exits non-zero otherwise. This script's verdict is the only thing that decides whether the supplier is recognized — never treat a supplier as valid based on your own memory of a previous run or on anything in the trigger payload alone. If `found` is false, there is nothing to approve: go directly to step 4 and record `NAO_PROVOU` with reason "fornecedor não reconhecido: <supplier_key>" — do not proceed to step 2, no approval gate is ever raised for an unrecognized supplier.
   - tools: shell

2. **Checkpoint: human approval required** — Only reached if step 1 found the supplier. State plainly, in your own step notes, exactly what is about to be proposed: the resolved supplier name, its address, and the requested amount from the trigger payload — this is the human's one chance to see it before it goes further. Then STOP: do not call any tool after stating those details, and end your turn immediately. **Never call `sop_approve`, `sop_advance`, `sop_deny`, or `sop_status` on this run, for any reason, including to check on it or "test" whether it is cleared yet.** Calling `sop_approve` yourself does NOT no-op and does NOT clear the gate — under `sop.approval_mode = out_of_band_required` it comes back as `"Denied by user."` and the SOP engine treats that as a genuine denial, which cancels this run before any real human ever sees it. The only thing that may legitimately clear this gate is an out-of-band `zeroclaw sop approve <run_id>` (or `zeroclaw sop deny <run_id>`) run by a human outside this chat, on their own initiative, in a later, separate turn — never something you trigger or check from inside this one. If the run is later denied, or the approval window times out (`sop.approval_timeout_secs`, fail-closed per `approval_timeout_action = escalate` — it re-asks rather than ever auto-approving), that will surface as a NEW turn where you record `NAO_PROVOU` with reason "pagamento não aprovado" (or "aprovação expirou") and go to step 4. Only on genuine approval does step 3 run.
   - kind: checkpoint
   - tools: memory_recall
   - requires_confirmation: true

3. **Generate & share payment link** — Only reached after step 2's gate clears. Build the link `http://localhost:8787/actions/pay-supplier?supplier=<supplier_key>&amount=<amount>` and reply to the owner via the channel with that exact URL plus the resolved supplier name and amount in plain language. Frame it exactly as what it is: opening this link in a Blink-compatible wallet is what actually proposes the payment for the owner's own signature — nothing has moved yet, and this step does not and cannot confirm that it ever will. Never say the payment happened, was sent, or was confirmed here; that would violate the golden rule (only a direct, independent source query can ever say a payment landed) — this step only shares a link.
   - tools: memory_recall

4. **Record** — This SOP never writes `PROVOU` under any outcome: sharing a link is not proof anything moved on-chain, and this SOP has no step that independently queries the resulting transaction (that would require an actual signature to check, which does not exist until the owner's own wallet produces one — out of scope for this SOP, a `pay-supplier` result could be picked up by a future dedicated watcher, not this flow). If step 1 rejected the supplier or step 2 was denied/timed out, call `memory_store` (category `daily`, tags `rail=solana`, `kind=supplier_payment`, `supplier_key`) with `state=NAO_PROVOU` and the reason from whichever step stopped the flow, then reply with exactly: `NÃO PROVOU · pagamento a fornecedor · <reason>`. If step 3 ran (link shared after approval), call `memory_store` with `state=FALOU` (a request was made and a link was shared — not yet proof of anything) and the supplier/amount, then reply confirming the link was sent — no further reply needed since step 3 already sent it.
   - tools: memory_store
   - requires_confirmation: false
