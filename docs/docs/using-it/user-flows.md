---
title: User Flows
---

# User flows

The product is two Telegram bots. This page walks through what a real person types into each one and what should happen, step by step, for every core flow.

## Flow 1, One-time invoice (Solana Pay, Layer 0)

**Who**: the owner (`dono` bot), billing a client.

1. Owner: *"charge 20 USDC from client Marek, invoice 700"*
2. The `solana-pay-invoice` skill generates a real Solana Pay link tagged with a per-invoice `reference` key, and the agent shares it with the client. The ledger records this claim as **FALOU**.
3. The `invoice-watch` SOP starts polling the chain for that reference key.
4. When a real payment lands, the SOP does **two independent reads** before writing anything: an initial check, then a second, separate script that re-verifies the signature from scratch. Only after both agree does the state flip to **PROVOU**.
5. If nothing arrives within the timeout, the state is written as **NÃO PROVOU**: never left ambiguous.

**What this proves**: no screenshot, PDF, or "I already paid, trust me" message ever moves this state, tested directly against real social-engineering attempts (see [Security](/docs/how-it-works/security)).

## Flow 2, Recurring subscription (Layer 1)

**Who**: the owner, authorizing and then automatically collecting a recurring charge from a client.

### Authorization (client signs, once)

1. Owner shares an `authorize-subscription` Blink link with the client, specifying an amount-per-period cap and an expiry.
2. The client opens the link in their own wallet (e.g., Phantom) and signs. This creates an on-chain delegation record via the **Subscriptions & Allowances** program, the cap is enforced by the program itself, not by application code.
3. The agent never sees or touches the client's private key at any point.

### Recurring pull (agent executes, capped by the chain)

4. A maintenance job periodically checks which clients have active delegations directly from the chain (not a hardcoded list) and dispatches a `subscription-pull` SOP run for one client per cycle.
5. The SOP calls `transfer_recurring`, signed by the dedicated `agent-puller` key, which can only ever pull within the cap the client themselves authorized on-chain.
6. The SOP independently re-reads the delegation's on-chain allowance after the pull to confirm it actually dropped by the expected amount before writing **PROVOU**.

**Checking status**: the owner can ask *"which subscriptions are active?"* at any time, this uses the `subscription-visibility` skill, a read-only query against the chain, not a memory guess.

**Note on this demo's automatic pulling**: in the current deployment, the automatic recurring-pull cron job is intentionally left disabled by default (documented in [Known limitations](/docs/evidence/bugs-found)), triggering it for a live demo currently requires a technical operator to run it manually. The authorization step and the pull mechanism itself are both fully proven independently (see [Real-world validation](/docs/evidence/validation)).

## Flow 3, Supplier payment (Layer 1, Step 4)

**Who**: the owner, paying a known supplier via a Blink, with mandatory human approval.

1. Owner: *"pay 2 USDC to fornecedor-teste"*
2. The `supplier-payment` SOP resolves the supplier name against a fixed allowlist file via a deterministic script, never the agent's own judgment. An unknown supplier is rejected immediately, before any transaction is even built.
3. For a known supplier, the SOP **parks and waits for approval that must happen outside the chat**: a separate CLI command or admin HTTP call, which the agent itself is structurally unable to trigger (tested directly, see [Security](/docs/how-it-works/security)).
4. Once approved externally, the SOP generates and shares the payment Blink. The owner (or whoever holds the paying wallet) opens it and signs.
5. Because sharing a link is not proof a payment actually happened, this SOP only ever records **FALOU**, never PROVOU: it does not claim more certainty than it actually has.

**Testing this flow live**: the out-of-band approval step means a full demo recording needs the approval command run from a second terminal/session, not from inside the chat itself, see `TESTING.md` in the repository root for the exact commands.

## Flow 4, Pix receipt (BRL rail)

**Who**: the owner, logging a claimed Pix receipt and having it checked against the real bank statement.

1. Owner: *"a Pix of R$8500 just arrived on July 5th, 2026, from Empresa XYZ"*
2. This is recorded as **FALOU** immediately: someone alleged it, nothing more yet.
3. The `pix-watch` SOP queries the real bank statement via Pluggy (Open Finance), looking for a real transaction matching the claimed amount within a time window around the claimed date.
4. If a matching transaction is found in the actual statement, the state flips to **PROVOU**. If the statement was genuinely checked and nothing matched, it's recorded as **NÃO PROVOU**. If the check itself failed (e.g., a connectivity error), the claim stays FALOU with an explicit note that verification could not complete: it is never rounded up to a denial it didn't actually receive.

**What this proves in practice**: this exact flow was run live against the real sandbox bank statement, both for a claim that had no match (correctly NÃO PROVOU) and for the real known salary transaction (correctly PROVOU), see [Real-world validation](/docs/evidence/validation).

## Flow 5, Accountant consolidation (`contador`)

**Who**: the accountant, asking for a consolidated view across both rails.

1. Accountant: *"how much has been consolidated this week?"*
2. `contador` reads both rails' ledger state (via a read-only memory lookup, never a live database query it could run itself) and reports three separate totals, PROVOU, FALOU, and NÃO PROVOU, converting Solana-rail USDC into BRL using a real, live PTAX exchange rate, and never blurring the three states together.
3. `contador` has **no tool capable of moving funds** in its registry at all, not because it "chooses not to," but because `shell`, `memory_store`, and every `sop_*` tool are excluded from its configuration by construction. This was tested directly with a real prompt-injection attack impersonating a system administrator; the agent's trace shows zero tool-call attempts of any kind for that turn (see [Security](/docs/how-it-works/security)).

## The golden rule, restated for all five flows

Every one of these flows funnels into the same three-state rule:

| State | Meaning |
|---|---|
| **FALOU** | Someone claimed it |
| **PROVOU** | Independently confirmed at the source (on-chain signature, or real bank statement match) |
| **NÃO PROVOU** | Claimed, and the source was checked and did not confirm it |

No flow in this product has a fourth way to reach PROVOU. That is the entire point of the system.
