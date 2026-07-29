---
name: supplier-payment-request
description: >-
  Aciona o SOP supplier-payment (com allowlist e checkpoint de aprovação humana fora da banda) quando o dono pede para pagar um fornecedor em USDC (ex.: "paga 50 usdc pro fornecedor-teste"). Não gera o link diretamente — só dispara o SOP, que faz toda a validação e o gate.
version: 0.1.0
---

# Supplier Payment Request

Use this skill when the owner asks to pay a supplier/fornecedor
conversationally. This skill's only job is to correctly parse the request
and start the `supplier-payment` SOP with the right payload — it does
**not** validate the supplier itself (the SOP's own step 1 does that, via a
script, not this skill's judgment), does **not** decide whether to approve
the payment (the SOP's step 2 is a real out-of-band checkpoint this agent
cannot clear itself — see `evidence/layer1-blinks.md`), and does **not**
build or share the payment link itself (the SOP's step 3 does that, only
after real approval).

## Constants

- USDC-test mint decimals: 6 (multiply a human amount by 1,000,000 for the
  SOP's `amount` payload field, which is in base units — same convention as
  `subscription-authorize-link`)

## Steps

1. Extract from the request: a `supplier_key` (match against how the owner
   refers to the supplier — if unclear which known supplier they mean, ask;
   do not guess a key name) and a human `amount`. Do not attempt to look up
   or validate the supplier yourself (e.g. by reading `known-suppliers.json`
   directly) — that is deliberately the SOP's job, not this skill's, so
   there is exactly one place in the whole product that allowlist logic
   lives.

2. Convert `amount` to base units by multiplying by 1,000,000 and rounding
   to the nearest integer.

3. Call `sop_execute` with `name="supplier-payment"` and payload
   `{"supplier_key":"<supplier_key>","amount":"<base_units>","channel_session_id":"<the current channel/session id if available, otherwise omit>"}`.

4. Reply to the owner immediately confirming the request was submitted and
   is now waiting on a real approval step outside this chat — do not wait
   for the SOP to finish before replying, and do not claim anything about
   the payment's outcome in this reply (you do not know it yet; the SOP
   itself will report `FALOU` or `NÃO PROVOU` once it resolves, and even a
   `FALOU` there only means a link was shared, never that money moved).
   If step 1 rejects the supplier as unrecognized, that will come back as
   its own `NÃO PROVOU` from the SOP — do not pre-empt or second-guess that
   here.
