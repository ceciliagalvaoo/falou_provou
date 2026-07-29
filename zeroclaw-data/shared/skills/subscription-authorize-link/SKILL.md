---
name: subscription-authorize-link
description: >-
  Gera e compartilha o link (Blink) de autorização de assinatura recorrente em USDC, pro cliente assinar com a própria carteira. Use quando o dono pedir para configurar/enviar uma assinatura recorrente pra um cliente (ex.: "manda o link de assinatura de 20 usdc por mês pro cliente novo").
version: 0.1.0
---

# Subscription Authorize Link

Use this skill when the owner asks to set up or share a recurring-billing
authorization link for a client (e.g. "cria uma assinatura de 20 usdc por
mês", "manda o link de assinatura pro cliente Marek"). This skill never
creates any on-chain state itself and never touches a client's funds — it
only builds a link pointing at the Actions server's
`/actions/authorize-subscription` endpoint (see `evidence/layer1-blinks.md`).
The actual `create_recurring_delegation` transaction is built by that server
when the link is opened, and is only ever signed by the **client's own
wallet** — never this agent, never the merchant's wallet. Opening the link
does nothing by itself; it requires the client to review and approve in
their own wallet app.

## Constants (devnet, see `references/merchant_config.json` and
`evidence/layer1-blinks.md` — do not hardcode these anywhere else, read them
from here)

- Actions server base: `http://localhost:8787`
- USDC-test mint decimals: 6 (multiply a human amount by 1,000,000 for the
  `amount` query param, which is in base units)
- Default period, if the owner does not specify one: 30 days (`period_s=2592000`)
- Default expiry, if the owner does not specify one: 1 year (`expiry_s=31536000`)

## Steps

1. Extract from the request: `amount_per_period` (human units, e.g. "20
   usdc"), an optional `period` (convert to seconds: "por mês"/"mensal" →
   2592000, "por semana"/"semanal" → 604800, "por dia"/"diário" → 86400 —
   ask the owner to clarify if the period is ambiguous or missing and cannot
   be reasonably inferred from context), and an optional `expiry` (convert
   similarly, or use the 1-year default). Also extract a short `client_label`
   from the request (a name or short description) for your own reply and
   memory record — this is NOT sent to the Actions server, which does not
   need to know who the client is in advance; the client's own wallet
   address only exists once the client opens the link and connects it.

2. Convert `amount_per_period` to base units by multiplying by 1,000,000
   (6 decimals) and rounding to the nearest integer.

3. Build the link exactly as:
   `http://localhost:8787/actions/authorize-subscription?amount=<base_units>&period_s=<period_s>&expiry_s=<expiry_s>`

4. Call `memory_store` (category `daily`, tags `rail=solana`,
   `kind=subscription_authorize_link`, `client_label`) with
   `{"state":"FALOU","client_label","amount_per_period","period_s","expiry_s","link"}`.
   This is FALOU, not PROVOU, and never becomes PROVOU from this skill alone
   — only the `subscription-pull` SOP's own independent on-chain checks, once
   a real pull happens against a delegation the client actually created,
   can ever confirm anything here. This skill does not and cannot know
   whether the client will ever open the link.

5. Reply with the link and a plain-language explanation: what it authorizes
   (a capped, on-chain-enforced recurring charge — cite the cap, period, and
   expiry back to the owner/client in the reply so there's no ambiguity
   about what is being approved), that it requires the client's own wallet
   to sign, and that nothing is charged until — and unless — the client signs
   it. Never say the client "assinou" or "autorizou" in this reply; only the
   `subscription-pull` SOP's own record, checked later, can say that.
