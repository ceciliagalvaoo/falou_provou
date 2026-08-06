---
title: The Problem
---

# The problem, and what this is

## The problem

A freelancer or a small business billing across borders has two separate
bookkeeping problems, and neither of them is arithmetic.

**The first is that a receipt is not evidence.** A payment confirmation
screenshot is a five-second edit. A forwarded message saying "já paguei" costs
nothing to send and nothing to fake. Most books are kept by trusting exactly
these artefacts, because checking the real source by hand — opening the bank
app, opening the block explorer, matching amounts and timestamps — is tedious
enough that nobody does it for every entry.

**The second is that the accounts are already mixed.** According to
[Sebrae](https://agenciasebrae.com.br/cultura-empreendedora/61-dos-empreendedores-brasileiros-fazem-pagamentos-da-empresa-com-a-conta-pessoal/),
**61%** of Brazilian entrepreneurs still pay business expenses from a personal
account. So the ledger that matters is not the one the bank produces; it is the
one somebody assembles afterwards, out of claims.

Put an AI agent on top of that and the problem gets worse rather than better,
because a language model is very good at producing a confident sentence about a
payment it never checked. That failure is not hypothetical here — it happened
during development, and it is documented in full in
[Security & Custody](/docs/how-it-works/security#the-single-most-important-finding-of-this-project-a-model-swap-that-broke-the-golden-rule).

## What this is

**Falou e Provou** ("Claimed and Proven") is an operator-hosted
[ZeroClaw](https://github.com/zeroclaw-labs/zeroclaw) agent that keeps those
books across two rails — USDC on Solana, and Pix in Brazilian reais — under a
single rule: an entry is only ever marked proven when the source itself says
so.

The rule is not a promise in a system prompt. It is a set of procedures whose
verification steps call deterministic scripts, so the model's own opinion about
whether a payment happened is never what writes the entry. That mechanism is
described in [The golden rule](/docs/how-it-works/the-golden-rule).

The product surface is two Telegram bots:

- **`dono`**, the owner's agent — bills one-time invoices via Solana Pay,
  authorizes and executes recurring subscriptions within a cap the on-chain
  program enforces, pays allowlisted suppliers via Solana Blinks behind a human
  approval, and logs Pix receipts that only become proven after the real bank
  statement is read.
- **`contador`**, the accountant's agent — a read-only dossier that combines
  both rails into one BRL total, and is structurally incapable of moving money
  because no such tool exists in its registry.

## Why Brazil first

Brazil is not a narrower version of this problem. It is the hardest version:
the world's largest instant-payment system by transaction count, paired with a
freshly regulated stablecoin-as-FX regime. Building for it first means the
awkward parts are solved rather than deferred.

Two of the three layers below are Brazil-specific adapters. The core — billing
and verification on-chain — is universal.

<div className="fp-figure">

**Table 1: What is local, and what is not**

| Layer | Brazil today | Swap to expand |
|---|---|---|
| On-chain billing & verification | Solana Pay + recurring delegation | Nothing changes — it is universal |
| Local receiving rail | Pix via Open Finance | SEPA, UPI, ACH — an equivalent aggregator |
| Conversion & reporting | PTAX, Central Bank public API | A local reference rate, or a market source |

</div>

## What it deliberately does not claim

The Solana rail has moved real funds on mainnet-beta, and the signatures are
published in [Real-world validation](/docs/evidence/validation). The Pix rail
runs against Pluggy's sandbox by design, and the reasoning for that is in
[Reproducibility](/docs/using-it/reproducibility). Everything still open is
listed, unsmoothed, in [Bugs found & fixed](/docs/evidence/bugs-found).
