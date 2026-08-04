---
id: intro
title: Overview
sidebar_position: 1
slug: /
---

# Falou e Provou (Claim & Chain)

**Falou e Provou** ("Claimed and Proven") is a [ZeroClaw](https://github.com/zeroclaw-labs/zeroclaw) agent that bills clients in two rails — USDC on Solana and Pix in Brazilian reais — and refuses to record anything it cannot independently verify at the source.

Built for the Superteam Brasil bounty **"Build Solana-native plugins for Zeroclaw."**

## The golden rule

Every ledger entry, on either rail, has exactly one of three states:

| State | How it's earned | Who can fake it |
|---|---|---|
| **FALOU** (claimed) | Someone alleged it — including the owner, when entering something manually | The owner, against themselves only |
| **PROVOU** (proven) | A confirmed signature on Solana, or a transaction read directly from the real bank statement via Pluggy | Nobody |
| **NÃO PROVOU** (unproven) | Claimed, and the source denied it or stayed silent | — |

No screenshot, PDF, forwarded WhatsApp message, or "trust me" ever moves an entry to PROVOU. Only a direct, independently verifiable query to the real source can.

This rule isn't just a marketing promise — it was **tested live against the real running agent**, including under deliberate manipulation attacks (see [Security](/security)), and it was **actually broken once, during development** ([see the full incident](/security#the-single-most-important-finding-of-this-project-a-model-swap-that-broke-the-golden-rule)) — which is exactly what led to it being hardened structurally, not just by instruction.

## The two agents

The actual product is two Telegram bots, each with a completely different role and trust level:

- **`dono`** (owner) — the product surface. Bills one-time invoices via Solana Pay, authorizes and executes recurring subscriptions within a cap enforced by the on-chain program itself (never an unbounded key), pays known suppliers via Solana Blinks with mandatory human approval outside the chat, and logs Pix receipts that only become PROVOU after being checked against the real bank statement.
- **`contador`** (accountant) — the accountant's dossier. Answers "how much has been consolidated this week?" by combining both rails into BRL, and is **structurally incapable of moving money** — not because it "chooses not to," but because that capability simply does not exist in its tool registry. This was tested with a real prompt-injection attack (see [Security](/security)).

## Where to start

- [**Architecture**](/architecture) — how the pieces fit together: SOPs, skills, custody, the two rails.
- [**User flows**](/user-flows) — what a real person types and what should happen, step by step.
- [**Security**](/security) — the custody model, real attacks tested, and the incident that shaped the whole project.
- [**Real-world validation**](/validation) — real mainnet signatures, not a simulation.
- [**Known limitations**](/limitations) — what still doesn't work perfectly, said plainly.
- [**Deployment**](/deployment) — how and where this actually runs, 24/7.
- [**Reproducibility**](/reproducibility) — how to run this from scratch on another machine.
