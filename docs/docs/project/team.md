---
title: Team
---

# Team

Falou e Provou was built for the Superteam Brasil bounty **"Build
Solana-native plugins for Zeroclaw."**

- **Cecília Galvão** — [@ceciliagalvaoo](https://github.com/ceciliagalvaoo)
- **Pablo Azevedo** — [@zzaved](https://github.com/zzaved)

Source: [github.com/ceciliagalvaoo/falou_provou](https://github.com/ceciliagalvaoo/falou_provou)

## Where the work is

Nothing in this project is a mockup, so the honest way to describe the work is
to point at the things that run.

<div className="fp-figure">

**Table 1: What exists, and where it lives**

| Piece | Where |
|---|---|
| The two agents (SOPs, skills, maintenance jobs) | `zeroclaw-data/` |
| The Pix rail, against Pluggy's Open Finance API | `pix-rail/` |
| The Solana Actions (Blinks) server | `tooling/actions-server/` |
| Devnet tests for the recurring-delegation program calls | `tooling/subscriptions-test/` |
| The landing page | `landing/` |
| This documentation site | `docs/` |

</div>

The two bots run 24/7 on a public server rather than on a laptop — how and
where is in [Deployment](/docs/using-it/deployment), including a deployment bug
that took a while to find. What was actually run against real money, with
signatures, is in [Real-world validation](/docs/evidence/validation). What
broke along the way, and what is still open, is in
[Bugs found & fixed](/docs/evidence/bugs-found).
