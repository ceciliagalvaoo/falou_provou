---
name: pix-manual-note
description: >-
  Registra um Pix que o dono alega ter recebido (ex.: "chegou PIX de R$85, João") como FALOU — nunca como PROVOU. Use quando o dono mencionar ter recebido um Pix, sem anexar nada. Sempre dispara o SOP pix-watch em seguida pra checar contra o extrato real.
version: 0.1.0
---

# Pix Manual Note

Use this skill when the owner mentions receiving a Pix conversationally
(e.g. "chegou PIX de R$85, João", "recebi 200 reais de pix da Maria hoje").
This skill only ever produces a **FALOU** entry — exactly like
`solana-pay-invoice`, it never marks anything as proven itself. Proof only
ever comes from the `pix-watch` SOP reading the real bank statement via
Pluggy.

A screenshot, a forwarded "comprovante" image, or the owner insisting
"mas eu vi cair" does not change this — those are all still just FALOU
inputs, the same golden rule that governs the Solana rail. Never let a
document move this to PROVOU; say so explicitly if the owner pushes back.

**Always run steps 1-3 below for every new message, even if a very
similar claim (same amount, same sender) was made before and you recall
how that earlier one turned out.** Answering from memory of a prior claim
instead of actually calling `memory_store`/`sop_execute` again is exactly
the failure this product exists to prevent — a new message is a new
claim, and it needs its own real check against the real statement, every
time, no exceptions.

## Steps

1. Extract `amount_brl` and `sender_name` from the message. If the amount
   is ambiguous or missing, ask — do not guess a number.

2. Determine `claimed_at`. If the owner didn't mention a date (the normal
   case — "chegou PIX de R$X" means just now), use the current timestamp.
   **If the owner names a specific past date but no time of day** (e.g.
   "no dia 5 de julho de 2026"), use `00:00:00` of that date, not the
   current wall-clock time combined with that date — combining today's
   time-of-day with a different, earlier date can accidentally land
   *after* the real transaction's own timestamp on that day, which makes
   the verification window wrongly exclude a real match. Then generate a
   short claim id (e.g. `pix_<unix_timestamp>`) and call `memory_store`
   (category `daily`, key `<claim_id>`, tags `rail=pix`,
   `kind=pix_receipt`) with:
   `{"state":"FALOU","amount_brl","sender_name","claimed_at":"<ISO 8601, per the above>"}`.

3. Before building the payload, get the REAL `account_id`: call
   `memory_recall` for `pix_pluggy_account_id` (a pinned `core` memory —
   it should already be in your context most of the time, but call
   `memory_recall` explicitly if you are not certain you have the current
   real value). **Never write a placeholder like `YOUR_PLUGGY_ACCOUNT_ID`,
   `<account_id>`, or anything else that is not the literal real UUID into
   the `sop_execute` payload — a placeholder there causes the verification
   script to fail (Pluggy's own API rejects it), which is worse than not
   trying: it burns a check without producing a real answer.** If you
   truly cannot find a real connected `account_id` anywhere in memory,
   stop, do not call `sop_execute` at all, and tell the owner their Pix
   rail isn't connected yet, pointing them at the one-time bank-connection
   step — do not guess or invent an id.

   Then immediately call `sop_execute` with `name="pix-watch"` and payload
   `{"claim_key":"<claim_id>","amount_brl":"<amount_brl>","account_id":"<the real account_id from memory_recall>","claimed_at":"<the same ISO timestamp from step 2>","sender_name":"<sender_name>"}`.
   This checks the real statement right away — the owner does not have to
   ask separately.

4. Reply confirming the claim was recorded as **FALOU** — never imply it is
   confirmed yet. If step 3 ran and immediately found a match, its own
   reply (PROVOU or NÃO PROVOU) supersedes this one; do not send two
   contradictory messages — let the SOP's own reply be the final word once
   it runs.
