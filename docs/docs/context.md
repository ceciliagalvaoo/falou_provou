---
title: The Context
---

# Why this exists

Most write-ups about an agent that handles money start with the agent. This one starts with the
receipt, because the receipt is the whole problem.

## A receipt stopped being evidence

Through 2026 the Brazilian retail trade converged on one sentence, repeated at counters and in
shop owners' groups: **"comprovante não é pagamento"**, a payment receipt is not a payment.

It became a sentence people say because faked receipts stopped being a craft and became a
service. Bots sold openly in Telegram and WhatsApp groups generate PDFs indistinguishable from
the banks' own, complete with logo, font and layout, in seconds. The scheduled-Pix scam scaled on
the back of them, and the Central Bank changed the rules in February 2026 in response.

So the sentence is true, and it is also useless on its own. Saying "a receipt is not a payment"
does not tell a shop owner what a payment *is*. That is the gap this product sits in.

## The books being kept are not books

The gap matters more because of what it lands on. According to Sebrae's
**Hábitos Financeiros dos Pequenos Negócios**:

- **61%** of small business owners pay company expenses from a personal account. It was 60% in
  2023, so this is not improving. In the Northeast it reaches **67%**.
- Of those who control their finances at all: **30%** use a spreadsheet, **25%** use a **paper
  notebook**, **20%** use an app.

A quarter of this market keeps its ledger in a notebook. That is worth stating without
condescension, because the notebook is not the mistake. Counting marks on paper is an honest and
extremely old technology, and it is the reason the counted strokes in this product's own visual
system are counted strokes. What the notebook cannot do is tell you whether the money it records
actually arrived. Neither can the spreadsheet, and neither can the app.

## And the money is arriving from two directions

The same person is now billing across a border. Payoneer's survey of Brazilian freelancers found
**83%** already serve or plan to serve clients abroad, and of 1,428 Brazilian developers working
for foreign organisations, **1,220** work for American ones. Most operate as PJ or MEI and issue
invoices.

Meanwhile Pix runs underneath everything domestic: **36.3 billion transactions** between January
and May 2026, moving roughly **R$ 16 trillion**, per Central Bank figures.

So there are two rails, one book, and no way to prove either.

## The regulator closed one door and opened another

Since **BCB Resolution 521/2025**, an operation with a foreign-currency stablecoin is a foreign
exchange operation, with the reporting and the IOF that implies. **Resolution 561/2026** goes
further and bars virtual assets as a settlement rail in eFX from October.

Read one way, that is a crackdown. Read accurately, it is an obligation: a Brazilian receiving in
USDC today needs an auditable trail, and nobody is handing them one.

## The synthesis

> Solana does not have a rail problem in Brazil. It has a proof problem.

The rail exists and it works. What stops adoption is that the person using it cannot explain to
an accountant, or to the Receita Federal, what that dollar-denominated money was. The bottleneck
in 2026 is accounting and regulatory, not technical.

## Which is why this product refuses to be reassuring

The standard pitch for crypto in Brazil promises yield, or a cheaper dollar. That pitch is
getting quieter, partly because the Central Bank is closing it, and partly because everyone is
making it.

This one promises something unfashionable and much smaller: **proof**. The agent will tell its
own owner "no". It will refuse a receipt from a real client. It will mark something
<span className="fp-state fp-state--nao">NÃO PROVOU</span> when the source is silent, rather than
quietly assume the best. A product that says no to the person paying for it is a strange thing to
build, and it is the only version of this that is worth anything.

The rest of this documentation is about how that refusal is enforced in code rather than
promised in a prompt. Start with [The golden rule](/docs/how-it-works/the-golden-rule).

## Why Brazil first

Brazil is not a narrower version of this problem. It is the hardest version: the world's largest
instant-payment system by transaction count, paired with a freshly regulated
stablecoin-as-foreign-exchange regime. Building for it first means the awkward parts are solved
rather than deferred.

Two of the three layers below are Brazil-specific adapters. The core, billing and verification
on-chain, is universal. Someone in another country runs the core in one evening without touching
a Brazilian bank.

<div className="fp-figure">

**Table 1: What is local, and what is not**

| Layer | Brazil today | Swap to expand |
|---|---|---|
| On-chain billing and verification | Solana Pay + recurring delegation | Nothing changes, it is universal |
| Local receiving rail | Pix via Open Finance | SEPA, UPI, SPEI, ACH, an equivalent aggregator |
| Conversion and reporting | PTAX, Central Bank public API | A local reference rate, or a market source |

</div>

## What this deliberately does not claim

The Solana rail has moved real funds on mainnet-beta, and the signatures are published in
[Real-world validation](/docs/evidence/validation). The Pix rail runs against Pluggy's sandbox by
design, and the reasoning is in [Reproducibility](/docs/using-it/reproducibility). The agent does
hold one real, reusable private key, and what is guaranteed about it is narrower than "no keys":
see [Security and custody](/docs/how-it-works/security). Everything still open is listed,
unsmoothed, in [Bugs found and fixed](/docs/evidence/bugs-found).

## A note on these numbers

Every figure above is attributed to its source in the same sentence, because a write-up that
inflates one number loses the benefit of the doubt on all the others. The Sebrae, Payoneer and
Central Bank figures are the load-bearing ones. If you are checking this document, those are the
four to check.
