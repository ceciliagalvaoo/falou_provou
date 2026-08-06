---
title: Architecture
---

# Architecture

## System overview

```
                    ┌─────────────────────┐
                    │  Telegram (dono)     │◄──── clients, suppliers
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐        ┌──────────────────────┐
                    │   ZeroClaw daemon    │───────►│ Telegram (contador)  │◄── accountant
                    │  (agents: dono,      │        └──────────────────────┘
                    │   contador)          │
                    └──────┬───────┬───────┘
                            │       │
              memory_recall│       │read-only
                (cross-agent, one-way only)
                            │
              ┌─────────────▼─────────────┐
              │   SOPs (procedures)        │   invoice-watch · subscription-pull
              │   + Skills (interpretation)│   pix-watch · supplier-payment
              └──────┬──────────────┬──────┘
                     │              │
        ┌────────────▼───┐   ┌──────▼─────────────┐
        │  Solana (real)  │   │  Pluggy (Open       │
        │  devnet/mainnet │   │  Finance, sandbox)   │
        └─────────────────┘   └──────────────────────┘
```

## The two rails

### Solana rail (USDC)

- **Layer 0, one-time invoice**: the `solana-pay-invoice` skill generates a real Solana Pay link (a per-invoice `reference` key). The `invoice-watch` SOP polls the chain and only writes PROVOU after **two independent reads**: an initial check, and a second one, run by a different script, that re-verifies the signature from scratch without trusting the first result. This second check exists specifically because, during development, a smaller model **fabricated** a fake signature once (see [Security](/docs/how-it-works/security)), the two-step design treats that as a permanent structural risk, not a one-off bug.
- **Layer 1, recurring subscription**: uses the on-chain **Subscriptions & Allowances** program (`De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44`). The client authorizes once, setting a per-period cap and an expiry, that cap is **enforced by the Solana program itself**, not by our application code. A dedicated agent key (`agent-puller`), used to execute already-authorized recurring pulls, can only ever call one specific instruction, within a cap recorded on-chain by the program. This is verifiable (an attempted pull above the cap is rejected by the program, not by our own code). See the [full custody paragraph](/docs/how-it-works/security#custody-model-what-the-agents-key-can-actually-do).
- **Layer 1, step 4, supplier payment**: via Solana Actions/Blinks, with two gates: (1) the destination must resolve against an allowlist checked by a script, never by the agent's own reading of it; (2) releasing the link requires human approval **outside the chat**, the agent cannot approve its own request (this was tested under a real attack, see Security).

### Pix rail (BRL)

Via [Pluggy](https://pluggy.ai) (Open Finance), in sandbox mode by design (not a shortcut, see why in [Reproducibility](/docs/using-it/reproducibility)). The owner logs a claimed receipt ("Pix of R$50 just arrived, client X") as FALOU; the `pix-watch` SOP reads the real bank statement via Pluggy and only confirms PROVOU if it finds a real transaction matching amount and time window, never by a "Pix" label in the statement (the Pluggy sandbox account doesn't label transactions that way, and real statement text varies too much to rely on either).

## The "SOPs" (Standard Operating Procedures)

Every critical verification in the product is a SOP, a multi-step procedure defined in plain text (`SOP.md` + `SOP.toml`), not a free-form decision by the model. The steps that do the actual checking call deterministic scripts (Python/Node) via `shell`, never the model's own "opinion" about whether something happened.

| SOP | What it verifies | Never writes PROVOU without... |
|---|---|---|
| `invoice-watch` | One-time Solana Pay invoice | two independent reads against the chain |
| `subscription-pull` | Recurring charge | a real, confirmed `transfer_recurring` call |
| `pix-watch` | Pix receipt | a real transaction found in the statement via Pluggy |
| `supplier-payment` | Supplier payment | (never writes PROVOU at all, only FALOU, since sharing a link is not proof a payment happened) |

## Custody, the single most important summary

The agent **never** holds an unbounded key. There are three distinct custody patterns in this product, and none of them is "the agent can spend whatever it wants":

1. **The client always signs**: for every one-time invoice and every subscription authorization, the only signature that actually moves or authorizes funds is the client's own wallet. The agent never sees that private key.
2. **The agent's key, capped by the program**: the `agent-puller` key, used to execute already-authorized recurring pulls, can only call one specific instruction, within a cap recorded on-chain by the Solana program itself. This is verifiable, an attempt to pull above the cap is rejected by the program, not by our code.
3. **Human approval outside the chat**: supplier payments require an approval the agent cannot give itself, tested under a real attack.

See the full breakdown in [Security](/docs/how-it-works/security).

## Tech stack

- **Agent runtime**: [ZeroClaw](https://github.com/zeroclaw-labs/zeroclaw) v0.8.3 (Rust), running as a daemon.
- **Model**: Claude Sonnet 4.5, via the Anthropic API: this specific choice is treated as a **safety-relevant decision**, not just cost/quality. See why in [Security](/docs/how-it-works/security#the-single-most-important-finding-of-this-project-a-model-swap-that-broke-the-golden-rule).
- **Solana**: `@solana/web3.js`, `@solana/kit`, `@solana-program/token`, `@solana/subscriptions`.
- **Actions/Blinks server**: plain Node.js, implementing the real Solana Actions spec.
- **Pix/Open Finance**: a minimal HTTP client against Pluggy's real API, no SDK.
- **Persistence**: SQLite (agent memory, SOP run state, cron).
- **Maintenance jobs**: zero-LLM-cost scripts (never call the model) running via cron, handling data reconciliation and cleaning up stuck runs, detailed in [Known limitations](/docs/evidence/bugs-found).
