---
id: intro
title: Overview
---

# Falou e Provou (Claim & Chain)

**Falou e Provou** ("Claimed and Proven") is an operator-hosted
[ZeroClaw](https://github.com/zeroclaw-labs/zeroclaw) agent that bills clients
in two rails, USDC on Solana and Pix in Brazilian reais, and refuses to
record anything it cannot independently verify at the source.

Built for the Superteam Brasil bounty **"Build Solana-native plugins for
Zeroclaw."**

**[Watch the demo](https://youtu.be/1YYHAs6ga1c)** ·
**[Landing page](https://falou-provou.onrender.com)** ·
**[Source](https://github.com/ceciliagalvaoo/falou_provou)**

## Watch the demo

<div style={{position:'relative',paddingBottom:'56.25%',height:0,overflow:'hidden',maxWidth:'820px',margin:'0 auto',borderRadius:'4px',border:'1px solid var(--fp-hairline)'}}>
  <iframe style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',border:0}} src="https://www.youtube.com/embed/1YYHAs6ga1c" title="Falou e Provou: an agent that only records what it can prove" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe>
</div>

<div style={{textAlign:'center',opacity:0.75,marginTop:'0.9rem',fontSize:'0.85rem'}}>One minute and forty four seconds. The transaction in it is on mainnet-beta, and you can open it yourself.</div>

## The golden rule

Every ledger entry, on either rail, has exactly one of three states.

<div className="fp-figure">

**Table 1: The three states**

| State | How it is earned | Who can fake it |
|---|---|---|
| <span className="fp-state fp-state--falou">FALOU</span> | Someone alleged it, including the owner, when entering something manually | The owner, against themselves only |
| <span className="fp-state fp-state--provou">PROVOU</span> | A confirmed signature on Solana, or a transaction read directly from the real bank statement via Pluggy | Nobody |
| <span className="fp-state fp-state--nao">NÃO PROVOU</span> | Claimed, and the source was checked and did not confirm it, it denied the claim, or the transaction simply was not there | n/a |

</div>

No screenshot, PDF, forwarded WhatsApp message, or "trust me" ever moves an
entry to PROVOU. Only a direct, independently verifiable query to the real
source can.

This is not a marketing promise. It was **tested live against the real running
agent**, including under deliberate manipulation attacks (see
[Security & Custody](/docs/how-it-works/security)), and it was **actually
broken once, during development**
([the full incident](/docs/how-it-works/security#the-single-most-important-finding-of-this-project-a-model-swap-that-broke-the-golden-rule)), which is exactly what led to it being hardened structurally rather than by
instruction. The mechanism is described in
[The golden rule](/docs/how-it-works/the-golden-rule).

## The two agents

The actual product is two Telegram bots, each with a completely different role
and trust level:

- **`dono`** (owner), the product surface. Bills one-time invoices via Solana
  Pay, authorizes and executes recurring subscriptions within a cap enforced by
  the on-chain program itself (never an unbounded key), pays known suppliers
  via Solana Blinks with mandatory human approval outside the chat, and logs
  Pix receipts that only become PROVOU after being checked against the real
  bank statement.
- **`contador`** (accountant), the accountant's dossier. Answers "how much has
  been consolidated this week?" by combining both rails into BRL, and is
  **structurally incapable of moving money**: not because it "chooses not to,"
  but because that capability simply does not exist in its tool registry. This
  was tested with a real prompt-injection attack (see
  [Security & Custody](/docs/how-it-works/security)).

### The two bots, and who they talk to

Both are live right now, not a mockup. **They also refuse anyone the operator
has not bound**, which is deliberate rather than a limitation: peer groups in
ZeroClaw are mutual opt-in and deny by default, so a billing agent that accepted
messages from strangers would be a custody failure rather than a demonstration.
Scanning a code opens the chat, and the bot will say it needs operator approval.
Ask and we will bind your id.

What needs no permission from anyone is the chain. The mainnet signature in
[Real-world validation](/docs/evidence/validation) opens in any public block
explorer, and that is the only kind of proof this product would accept from
someone else.

<div className="fp-figure">

**Figure 1: The two bots on Telegram**

<table>
<tr>
<td align="center">
<img src="/falou_provou/img/qr-dono.svg" width="140" height="140" alt="QR code linking to @falouprovou_bot on Telegram" /><br/>
<strong><a href="https://t.me/falouprovou_bot">@falouprovou_bot</a></strong><br/>
<sub>owner, billing, subscriptions, Pix</sub>
</td>
<td align="center">
<img src="/falou_provou/img/qr-contador.svg" width="140" height="140" alt="QR code linking to @falouprovou_contador_bot on Telegram" /><br/>
<strong><a href="https://t.me/falouprovou_contador_bot">@falouprovou_contador_bot</a></strong><br/>
<sub>accountant, read-only dossier</sub>
</td>
</tr>
</table>

</div>

## How this site is organised

Four questions, four categories. Nothing is documented in two places.

**What it is**: you are here. [The context](/docs/context) covers
why this exists, what it replaces, and why Brazil is the hardest version of the
problem rather than a narrow one.

**How it works**: the design.
[The golden rule](/docs/how-it-works/the-golden-rule) is the rule itself and
where it is enforced in code.
[Architecture](/docs/how-it-works/architecture) is how the pieces fit together:
SOPs, skills, the two rails, the tech stack.
[Security & Custody](/docs/how-it-works/security) is the custody model, every
attack run against the live agent, and the incident that shaped the project.

**Using it**: operating it.
[User flows](/docs/using-it/user-flows) is what a real person types and what
should happen, step by step, for all five flows.
[Deployment](/docs/using-it/deployment) is how and where this runs 24/7.
[Reproducibility](/docs/using-it/reproducibility) is how to stand it up from
scratch on another machine.

**Evidence**: proof it is real.
[Real-world validation](/docs/evidence/validation) is the actual mainnet
signatures, openable in a block explorer.
[Bugs found & fixed](/docs/evidence/bugs-found) is every real bug found during
testing, how each was fixed, and the few things still genuinely open.

**Project**: [Design system](/docs/project/design-system) and
[Team](/docs/project/team).
