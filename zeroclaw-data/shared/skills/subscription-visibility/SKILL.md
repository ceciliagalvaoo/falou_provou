---
name: subscription-visibility
description: >-
  Lista as assinaturas recorrentes ativas do dono, direto da chain (cliente, teto por período, quanto resta no período atual, expiração). Só leitura, nunca assina nada. Use quando o dono pedir para ver clientes/assinaturas ativas, quanto falta cobrar, ou perguntar sobre revogar uma.
version: 0.1.0
---

# Subscription Visibility

Use this skill when the owner asks to see their active recurring clients
(e.g. "quais assinaturas eu tenho ativas", "quanto falta pra cobrar do
cliente X esse mês", "como revogo uma assinatura"). Read-only: this skill
never signs a transaction and never changes on-chain state.

## Steps

1. Run this exact absolute path via the shell tool, do not search for it:
   ```
   node /mnt/c/Users/Inteli/Downloads/claim_chain/zeroclaw-data/shared/skills/subscription-visibility/scripts/list_active_subscriptions.mjs \
     --rpc-url https://api.devnet.solana.com \
     --delegatee HepTxTom6v8pkFAfa5j4FYS3UG2GbQhQoTRTgttaUnGF \
     --mint Hm48r4majxKMNzBBDP13KnUcW6C612sPTTd9MuKfTFi2
   ```
   It prints a JSON array, each entry:
   `{"delegation_pda","delegator","amount_per_period","remaining_this_period","period_length_s","expiry_ts","expired"}`.
   This is a live, direct on-chain read — the same lookup and lazy
   period-rollover math `subscription-pull` itself uses — never a cached or
   remembered list. If the owner asks about a client you don't recognize by
   name, you cannot resolve a wallet address to a human name — reply with
   the raw list and let the owner match it themselves; do not guess.

2. If the array is empty, tell the owner there are no active recurring
   clients right now — this is a normal, valid state, not an error.

3. Present the list in plain language: for each entry, the client's
   wallet address (truncated is fine for readability, e.g. first 6 + last
   4 chars), the per-period cap and period length (convert seconds to a
   human unit — days/weeks/months), how much of this period's cap remains
   unclaimed, and the expiry date if one is set. If `expired` is true, say
   so plainly — an expired delegation is inert; `subscription-pull` will
   correctly skip it (nothing due), but it still shows here for visibility
   until the client re-authorizes.

4. If the owner asks how to revoke one: be precise about custody here —
   **only the client can revoke their own delegation, never the owner and
   never this agent** (`revoke_delegation` requires the delegator's own
   signature; verified directly against devnet, see
   `evidence/layer1-custody-paragraph.md`'s revoke addendum). Tell the
   owner this plainly rather than offering to do it for them or implying
   you have any ability to. If they need a client to revoke, they need to
   ask that client to do it from their own wallet against the Subscriptions
   & Allowances program — this product does not yet have a self-serve
   revoke Blink built (a known gap, not something to paper over).
