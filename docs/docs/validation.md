---
id: validation
title: Real-world Validation
sidebar_position: 5
---

# Real-world validation

This page exists to close the one question that matters most for a bounty like this: **did this actually run against real infrastructure and real money, or is it a simulation?** Everything below happened on Solana **mainnet-beta**, with real wallets, real USDC, and real SOL — nothing here is devnet or mocked. Devnet evidence (used for iterative development and heavier testing, like cap-enforcement and multi-client scenarios) is also included for completeness, clearly labeled.

## Wallets used (mainnet)

| Role | Address |
|---|---|
| Client | `HTrLsm862Y3YKfBASVZK5vHXeQkQ5Difp2szKG7ziRrk` |
| Merchant | `ADmd4LkUar6BpUZxAR24jL19QHKPZFqDiVPXqP1j1GzQ` |
| Agent-puller | `FxVNPbnRBBxGSKKiVnm8Rery3vxjMEeqs184VU55VVDa` |

The USDC mint was independently verified before use, not assumed from memory: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` — confirmed via `getAccountInfo` (6 decimals, ~7.6B supply, standard SPL Token program), consistent with the real Circle-issued mainnet USDC mint.

## Layer 0 — real mainnet invoice payment

- Invoice: 0.05 USDC.
- Payment signature: `3DSMW25MJ7eR7CkVwDwCMDZuum2MkyUGfHvBxxTq36BkrJnjJkBN1Ng5LtausUFjURzFH3LCpmENBmqkbRYNM58B`
- Independently verified via `getTransaction`: finalized, `err: null`, signer is the client's own wallet, and the client's USDC balance drops by exactly 0.05 while the merchant's rises by exactly 0.05.

## Layer 1 — real mainnet subscription authorization + autonomous pull

**Authorization** (client's own signatures, agent never touched a key):

1. `init_subscription_authority`: `4C2W189Fstiuy5Y7Pw8t5nB6UboKPMGfPeE3a6P9EVn9KebHseYZYbtJnUvZ66QbgWPPbZS8AMBDy8piA1KXwCVJ`
2. `create_recurring_delegation` (cap 0.0004 USDC / 60s period): `4NNSHG518KM8tWA4J9Q6zz7QUtc8dp7ya1YJ1fBbpXs1w3YCW5CSNX9K1gnJwLbS5oapkGtjXMpZ2ip1LKdVJbLB`

Both signed entirely in the client's own Phantom wallet — the agent never had access to that private key at any point.

**Autonomous pull** (agent-puller's own signature, no human in the loop):

- `transfer_recurring`: `22Sz4DZ7ETJ7GJw2eeX237e79S96oCMDuSFnomuRsUUtE2aQkCbqFD1FSmPvNfQyXNzGDWV1B1CFDKCY8FbEcMfD`
- Independently verified two ways: the on-chain delegation's `amountPulledInPeriod` matches the pull exactly (400 units = 0.0004 USDC), and the merchant's actual USDC balance moved from 0.0500 to 0.0504 — an exact match.

## Layer 1, Step 4 — real mainnet supplier payment

1. **Allowlist rejection, unknown supplier**: a request for an unlisted supplier returned `"Unknown supplier ... not on the allowlist. Refusing to build a transaction."` — no transaction was ever built.
2. **Real payment to a known supplier**: 0.0002 USDC, signature `2ZHX2u4QDSwryAUg4dvusnS1PoGBz8k9U8JpWuquZXdM52drqpWWmM8kkgnM2h62ZCdurG5BpZ85jQMDoEy5B2yV`, independently verified via `getTransaction` — the merchant's balance dropped by exactly 0.0002 and the supplier's rose by exactly 0.0002.

## Real problems hit during mainnet testing (disclosed, not smoothed over)

- MetaMask does not sign Solana transactions in its default configuration — the operator switched to Phantom for this test.
- Opening the test page via `file://` silently blocked Phantom's browser extension injection in Chrome — fixed by serving over a local HTTP server instead.
- The public mainnet RPC intermittently returned `403 Access forbidden` to browser-origin polling requests, even though the same calls succeeded reliably server-side — a real limitation for any future browser-facing flow at scale, flagged rather than hidden.
- Screenshot-transcribed signatures were misread twice (visually similar characters in a small monospace font) — resolved both times by re-deriving the real value independently on-chain rather than trusting the transcription. The same "verify at the source, don't trust the report" discipline this whole product is built on, applied to reading a screenshot.

## Devnet evidence (development and heavier testing)

Mainnet testing above proves the mechanism works with real money; devnet testing (much more extensive, since it doesn't cost real funds) proves the mechanism holds up under adversarial and multi-client conditions:

- **Cap enforcement, proven twice independently**: a delegation's exact cap was pulled successfully, then an immediate attempt to pull one more unit in the same period was rejected on-chain (`AMOUNT_EXCEEDS_PERIOD_LIMIT`, program error 400) — no signature, no funds moved. Reproduced with two separate fresh delegations.
- **`revoke_delegation` proven for real**: a client revoked their own delegation; the account was confirmed gone on-chain, and a pull attempted against it afterward was rejected outright (`Invalid account owner`), not silently ignored.
- **Multi-client pull loop**: tested against 6 real delegations accumulated on the agent-puller key — 3 landed real `PROVOU` pulls with real signatures, 2 correctly recorded `NÃO PROVOU` (nothing due, program-rejected), and 1 correctly refused to write any state at all when it hit a rate limit mid-step, rather than fabricate an outcome.
- **First-time client authorization**, which requires a two-step transaction chain (`init_subscription_authority` cannot be batched with `create_recurring_delegation` in the same transaction, confirmed by a real on-chain failure when first attempted) — proven end-to-end with a genuinely fresh keypair, both steps landing real signatures.
- **Automated maintenance jobs**, run with zero LLM cost via shell-type cron jobs: a stale-run reaper, and a reconciliation job that scans the agent-puller's real on-chain transaction history and backfills any pull that landed on-chain but was never recorded in the ledger (a real gap found and closed: two genuinely unrecorded pulls were found and correctly backfilled from on-chain data, never from a document or assumption).

## Pix rail — real sandbox evidence

- Real Pluggy Item: `92b3e82c-46f1-4558-abeb-50f1c0bac934` (sandbox connector, "Pluggy Bank"), independently confirmed `status: "UPDATED"` via a direct API call.
- Real account: `e5fcba94-ee8e-4e36-81b7-deef4315d520`.
- Full pipeline run live against the actual daemon, both branches: a claim with no matching transaction correctly recorded **NÃO PROVOU**, and the real known salary transaction (`"SALARIO EMPRESA XYZ LTDA"`, R$8,500) correctly recorded **PROVOU** after independently querying the real bank statement.
- A real API bug hit mid-testing (Pluggy's `/v2/transactions` endpoint rejecting a previously-documented query parameter) was caught, fixed, and re-verified — and importantly, **before the fix landed, the SOP correctly failed closed**: it recorded NÃO PROVOU rather than silently defaulting to a false positive when the underlying check errored.

## Prompt-injection and attack testing

Full write-up in [Security](/security). In summary: fake payment receipts, off-the-books confirmation claims, checkpoint self-approval attempts, and direct key-exfiltration social engineering were all tested against the live agent. One real, serious finding (key exfiltration) was found and fixed structurally; every other attempt either failed outright or exposed a smaller, honestly-disclosed gap.

## What real-world testing does not cover

- Public hosting of the Actions/Blinks server on mainnet configuration specifically (the server supports it via environment variables, and the mechanism was proven working against mainnet — but the always-on production deployment currently runs devnet-configured; see [Deployment](/deployment)).
- The Solana-Pay-URI-native wallet flow (QR scan) on mainnet specifically — the mainnet invoice test above went through a manual-transfer fallback, documented honestly rather than hidden, because the available wallet setup didn't support opening a `solana:` URI directly in that environment.
- A full conversational run of the supplier-payment checkpoint gate specifically against mainnet (the gate mechanism itself was proven network-agnostic on devnet, and the mainnet payment itself was proven separately, but not run through the full conversational SOP checkpoint on mainnet in the same session).
