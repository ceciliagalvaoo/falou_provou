---
title: The Golden Rule
---

# The golden rule

Everything else in this project is an implementation detail of one rule. It is
worth stating on its own page, because it is the thing that has to survive
contact with a language model, a hostile user and a bad day.

> An entry is only ever marked proven when the source itself confirms it.

## The three states

Every ledger entry, on either rail, is in exactly one of these states. There is
no fourth, and there is no partial credit.

<div className="fp-figure">

**Table 1: The three states, and what earns each one**

| State | What it means | How it is earned | Who can fake it |
|---|---|---|---|
| <span className="fp-state fp-state--falou">FALOU</span> | Claimed | Someone alleged it — including the owner, entering it manually | The owner, against themselves only |
| <span className="fp-state fp-state--provou">PROVOU</span> | Proven | A confirmed signature read off Solana, or a transaction read off the real bank statement via Pluggy | Nobody |
| <span className="fp-state fp-state--nao">NÃO PROVOU</span> | Unproven | Claimed, and the source was checked and did not confirm it | — |

</div>

Two things about this table matter more than they look.

**FALOU is not a failure state.** Every claim is recorded the moment it is
made, including claims that later turn out to be false. Nothing is hidden or
silently dropped — it is simply not trusted yet. A ledger that quietly discards
what it cannot verify is a ledger that is lying by omission.

**NÃO PROVOU is a stronger statement than "unknown".** It does not mean the
check was skipped or timed out. It means the source was actually queried, and
the source did not confirm. Collapsing "we checked and it is not there" into
"we do not know" would throw away the most useful signal in the system.

## What never earns PROVOU

No artefact a human can produce moves an entry to proven. Not a screenshot, not
a PDF, not a forwarded WhatsApp message, not a bank confirmation email, and not
the owner insisting. All of those are claims, and claims are
<span className="fp-state fp-state--falou">FALOU</span>.

Neither does the model's own reading of any of those things. An agent that
looks at a receipt image and concludes "this appears to be a valid payment" has
produced a claim, not a proof — it has just laundered a human claim through a
machine.

Only a direct, independent read of the real source counts:

- **Solana** — a confirmed signature, fetched with `getTransaction` and
  re-checked from scratch.
- **Pix** — a transaction found in the real bank statement, read through
  Pluggy's Open Finance API, matched on amount and time window.

## Where the rule actually lives

The rule is not enforced by asking the model to behave. It is enforced by the
shape of the procedures it has to run.

Every critical verification is a **SOP** — a multi-step procedure defined in
plain text (`SOP.md` + `SOP.toml`) rather than left to the model's judgement.
The steps that do the actual checking call deterministic scripts over `shell`.
The model's job is to decide *which* procedure applies and to talk to the
human; it is never the thing that decides whether money arrived.

<div className="fp-figure">

**Table 2: What each procedure will not write PROVOU without**

| SOP | What it verifies | Never writes PROVOU without... |
|---|---|---|
| `invoice-watch` | One-time Solana Pay invoice | two independent reads against the chain |
| `subscription-pull` | Recurring charge | a real, confirmed `transfer_recurring` call |
| `pix-watch` | Pix receipt | a real transaction found in the statement via Pluggy |
| `supplier-payment` | Supplier payment | never writes PROVOU at all — sharing a payment link is not proof a payment happened |

</div>

The last row is the rule being honest about its own limits. Releasing a Blink
to a supplier is an action the agent took, not an outcome it observed, so it
stays a claim forever.

## Two independent reads, and why

`invoice-watch` does not confirm a payment once. It confirms it, and then a
second script re-verifies the signature from scratch without trusting the first
result.

That redundancy is not general paranoia — it is a scar. During development, a
smaller model **fabricated a signature** that had never existed, and the entry
was stamped proven on the strength of it. The full incident, including what
changed afterwards, is in
[Security & Custody](/docs/how-it-works/security#the-single-most-important-finding-of-this-project-a-model-swap-that-broke-the-golden-rule).

The fix that mattered was not "use a better model". It was making the
verification path structurally unable to accept a value the model produced.

## The rule under attack

The rule has been tested against the live agent, not only reasoned about:
fabricated receipts, an attempt to write a proven entry without ever touching
the chain, an attempt to bypass the supplier-payment approval, and a
prompt-injection demanding a fund transfer from the read-only accountant agent.

Each attempt, and what it returned, is documented in
[Security & Custody](/docs/how-it-works/security#real-attacks-tested-against-the-live-agent).
