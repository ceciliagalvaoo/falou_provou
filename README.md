# Falou e Provou (Claim & Chain)

Built for the Superteam Brasil bounty **"Build Solana-native plugins for
Zeroclaw."**

An operator-hosted [ZeroClaw](https://github.com/zeroclaw-labs/zeroclaw) agent
that bills in two rails — **USDC on Solana** and **Pix in BRL** — and
never records anything it did not verify at the source.

**Full documentation (the rule, architecture, security, real-world validation,
deployment, reproducibility):**
**[ceciliagalvaoo.github.io/falou_provou](https://ceciliagalvaoo.github.io/falou_provou/)**

**Landing page:** **[falou-provou.onrender.com](https://falou-provou.onrender.com)**

## The idea

Every ledger entry, on either rail, has exactly one of three states:

| State | Meaning |
|---|---|
| **FALOU** | Someone claimed it happened — including the owner, entering it manually |
| **PROVOU** | Confirmed directly against the source: a signature on Solana, or a transaction read from the real bank statement via Pluggy |
| **NÃO PROVOU** | Claimed, and the source was checked and did not confirm it |

No screenshot, forwarded message, or document ever moves an entry to
PROVOU. Only a direct, independent read of the real source does. That
rule is enforced in code (`SOP.md` steps, not just prose) throughout this
project, and has been verified against the live, running system —
including under active prompt-injection attacks.

Everything in this repo has been run against **real Solana mainnet-beta
transactions with real money**, not only devnet/sandbox — see
[Real-world validation](https://ceciliagalvaoo.github.io/falou_provou/docs/evidence/validation)
for the actual signatures.

## The product, live

The product is two Telegram bots, running 24/7 on a public server, not a
local demo. Scan to open one on your own phone:

<table>
<tr>
<td align="center">
<img src="landing/assets/qr-dono.svg" width="140" height="140" alt="QR code linking to @falouprovou_bot on Telegram"><br>
<strong><a href="https://t.me/falouprovou_bot">@falouprovou_bot</a></strong><br>
<sub>owner — billing, subscriptions, Pix</sub>
</td>
<td align="center">
<img src="landing/assets/qr-contador.svg" width="140" height="140" alt="QR code linking to @falouprovou_contador_bot on Telegram"><br>
<strong><a href="https://t.me/falouprovou_contador_bot">@falouprovou_contador_bot</a></strong><br>
<sub>accountant — read-only dossier</sub>
</td>
</tr>
</table>

- **[@falouprovou_bot](https://t.me/falouprovou_bot)** — `dono`, the owner's
  agent. Bills invoices, authorizes/collects recurring subscriptions, pays
  suppliers, logs Pix receipts.
- **[@falouprovou_contador_bot](https://t.me/falouprovou_contador_bot)** —
  `contador`, the accountant's read-only dossier agent.

## What's actually in here

Two ZeroClaw agents, one install:

- **`dono`** (the business owner's agent, Telegram) — the product surface.
  Accepts one-time Solana Pay payments, authorizes and pulls recurring
  USDC subscriptions within an on-chain capped delegation (never a raw
  unbounded key), pays allowlisted suppliers via Solana Blinks, and lets
  the owner log a Pix receipt claim that only gets confirmed against a
  real bank statement (via [Pluggy](https://pluggy.ai), sandbox mode).
- **`contador`** (the accountant's dossier agent, its own Telegram bot) —
  structurally read-only *by construction*: empty skill set, no `shell`,
  no `memory_store`, no SOP-triggering tools in its registry at all. It
  can only recall memory (cross-agent, read-only, from `dono`) and answer
  "quanto consolidou essa semana?" by combining both rails into one BRL
  total (Solana's USDC converted via the Central Bank's public PTAX rate).
  A real prompt-injection attack demanding a fund transfer was run against
  it live, and confirmed to fail closed — the agent's tool registry has
  nothing in it capable of moving funds, by construction.

Custody model for the recurring-pull path (the part most likely to be
misread as "the agent holds a master key"): it does not. A single
dedicated key can only ever call the delegated pull instruction within
the cap and expiry each client authorized on-chain themselves; the
Solana program enforces the cap, not application code.

## Prerequisites

- A `zeroclaw` binary (v0.8.3 or newer) — download a release for your
  platform from the [official releases page](https://github.com/zeroclaw-labs/zeroclaw/releases)
  and place it wherever you'll invoke it from (this project's own scripts
  assume `./tooling/zeroclaw`, but any location works if you adjust the
  path). WhatsApp support requires building from source with
  `--features channels-full`; the prebuilt binaries are enough for the
  Telegram-only setup described here.
- Node.js 22+ (uses `node:sqlite`, still experimental — that's expected,
  not a bug, if you see the `ExperimentalWarning` on stderr).
- Python 3 (for a couple of the maintenance scripts).
- An Anthropic API key.
- Two Telegram bot tokens (one per agent) — create both via
  [@BotFather](https://t.me/BotFather), `/newbot`, and note the token
  each one gives you. You'll also need your own Telegram numeric user ID
  (message [@userinfobot](https://t.me/userinfobot) to get it).
- A funded Solana devnet wallet (for the client/merchant roles) and a
  fresh keypair to act as the agent-puller (never reuse a wallet that
  holds real value for this role). `solana-keygen new` or any Solana SDK
  works.
- A free [Pluggy](https://dashboard.pluggy.ai) developer account —
  sandbox access is free and not time-limited; you only need the
  dashboard's `CLIENT_ID`/`CLIENT_SECRET`, not a paid plan.

## Setup

1. **Clone and rewrite the install path.** Every config file in this repo
   was originally written with an absolute path baked in (ZeroClaw's
   `config.toml`, `SOP.md`, and `SKILL.md` files are plain text it parses
   directly — there's no runtime path-templating layer). One command
   fixes all of them at once:
   ```
   tooling/rewrite-install-path.sh <your_absolute_project_root>
   ```
   Run this before your first `zeroclaw daemon` start.

2. **Set up the config.** Copy the template and fill in your own values —
   secret fields get encrypted at rest automatically, never paste a raw
   token directly into `config.toml`:
   ```
   cp zeroclaw-data/config.toml.example zeroclaw-data/config.toml
   ./tooling/zeroclaw config set channels.telegram.dono.bot_token "<token>" --no-interactive --config-dir zeroclaw-data
   ./tooling/zeroclaw config set channels.telegram.contador.bot_token "<token>" --no-interactive --config-dir zeroclaw-data
   ./tooling/zeroclaw config set providers.models.anthropic.default.api_key "<key>" --no-interactive --config-dir zeroclaw-data
   ```
   Then edit `zeroclaw-data/config.toml` directly to replace
   `REPLACE_WITH_YOUR_TELEGRAM_USER_ID` (both `peer_groups.*` blocks) with
   your own numeric Telegram ID, and
   `REPLACE_WITH_YOUR_AGENT_PULLER_PUBKEY` /
   `REPLACE_WITH_YOUR_TEST_USDC_MINT` / `REPLACE_WITH_YOUR_MERCHANT_ATA`
   in `[cron.subscription_pull]` with your own devnet addresses once you
   have them (leave that job `enabled = false` until you do).

3. **Set up the Pix rail (optional — the product runs completely without
   it; this rail is additive, never a single point of failure).**
   ```
   cp pix-rail/.env.example pix-rail/.env
   # edit pix-rail/.env with your real Pluggy CLIENT_ID/CLIENT_SECRET
   cd pix-rail/scripts && npm install
   node connect_server.mjs   # serves the one-time bank-connection page on :8791
   ```
   Open `http://localhost:8791`, click "Conectar banco," choose the
   sandbox "Pluggy Bank" connector, credentials `user-ok` / `password-ok`.
   Note the real `account_id` it prints and store it as a pinned memory
   the way `zeroclaw-data/shared/skills/pix-manual-note/SKILL.md` expects
   (see that file's step 3) — or ask `dono` to do it for you once it's
   running.

4. **Set up the Solana pieces you intend to test.** Each of these has its
   own isolated test script under `tooling/subscriptions-test/` and
   `tooling/actions-server/` — run those directly first (they print real
   devnet signatures) before wiring anything into the live agent. The
   Actions/Blinks server itself:
   ```
   cd tooling/actions-server && npm install && node server.mjs
   ```
   It's `localhost`-only by default for a fresh local reproduction like this
   one — the live, publicly-hosted deployment runs the same server behind
   real HTTPS; see
   [Deployment](https://ceciliagalvaoo.github.io/falou_provou/docs/using-it/deployment)
   for how.

5. **Start the daemon.**
   ```
   ./tooling/zeroclaw daemon --config-dir zeroclaw-data
   ```
   Message your `dono` bot on Telegram. Message your `contador` bot
   separately to test the read-only dossier.

## The front end

There are three surfaces outside Telegram, and all three run one design
system — **Tinta sobre Creme**: ink on cream, and the ink is turquoise.

| Where | What |
|---|---|
| `landing/` | the public landing page — static HTML and CSS, no build step |
| `docs/` | the Docusaurus documentation site |
| `pix-rail/connect-page/`, `tooling/actions-server/*.html` | the operator pages: bank connection, and the mainnet Blink tests |

Three rules generate almost all of it: one warm paper background and one
turquoise ink, with no gradients, no dark surfaces and no filled blocks of
colour outside a primary button; nothing decorative unless it is also true (the
counted marks count real things, the three state chips are the three real
states); and every mark is *drawn* rather than placed — strokes paint
themselves in along their own path, and are allowed to be uneven.

The palette, the type, the mark, the motion rules and the accessibility
numbers are written down in
[Design system](https://ceciliagalvaoo.github.io/falou_provou/docs/project/design-system).

To work on the landing page:

```
cd landing && python3 -m http.server 8899
```

To work on the docs:

```
cd docs && npm install && npm start
```

## Documentation

The docs site is organised around four questions, and nothing is documented in
two places.

| | |
|---|---|
| **What it is** | [Overview](https://ceciliagalvaoo.github.io/falou_provou/docs/intro) · [The problem](https://ceciliagalvaoo.github.io/falou_provou/docs/problem-and-solution) |
| **How it works** | [The golden rule](https://ceciliagalvaoo.github.io/falou_provou/docs/how-it-works/the-golden-rule) · [Architecture](https://ceciliagalvaoo.github.io/falou_provou/docs/how-it-works/architecture) · [Security & custody](https://ceciliagalvaoo.github.io/falou_provou/docs/how-it-works/security) |
| **Using it** | [User flows](https://ceciliagalvaoo.github.io/falou_provou/docs/using-it/user-flows) · [Deployment](https://ceciliagalvaoo.github.io/falou_provou/docs/using-it/deployment) · [Reproducibility](https://ceciliagalvaoo.github.io/falou_provou/docs/using-it/reproducibility) |
| **Evidence** | [Real-world validation](https://ceciliagalvaoo.github.io/falou_provou/docs/evidence/validation) · [Bugs found & fixed](https://ceciliagalvaoo.github.io/falou_provou/docs/evidence/bugs-found) |
| **Project** | [Design system](https://ceciliagalvaoo.github.io/falou_provou/docs/project/design-system) · [Team](https://ceciliagalvaoo.github.io/falou_provou/docs/project/team) |

## Bugs found & fixed, and what's still open (disclosed, not hidden)

Dozens of real bugs were found during live testing against the running
system — most are already fixed and documented with their root cause,
including the incident that shaped this project's design most (a model
swap that once broke the golden rule). A handful of things are genuinely
still open, each with a concrete reason it isn't closed yet. Full record:
[Bugs found & fixed](https://ceciliagalvaoo.github.io/falou_provou/docs/evidence/bugs-found)
and [Security & custody](https://ceciliagalvaoo.github.io/falou_provou/docs/how-it-works/security)
on the docs site. In short, locally:

- **`contador`'s Telegram channel needs its own bot token** (see Setup
  step 2) — without one it's still fully testable via
  `zeroclaw agent -a contador -m "..."` (no channel required), which is
  how its security guarantees were actually verified.
- **Cross-rail consolidation reads from a periodically-recomputed
  snapshot, not a live query.** `zeroclaw-data/shared/maintenance/consolidate_snapshot.mjs`
  runs every 30 minutes (zero LLM cost, a plain deterministic table scan)
  and writes the real totals into `contador`'s memory; asking immediately
  after a brand-new transaction lands may reflect a snapshot up to 30
  minutes old. This design was chosen deliberately after a live test
  showed `contador`'s own on-demand memory search was not reliable enough
  for exhaustive sums.
- **The optional WASM plugin was not built.** This project's own scope
  rubric explicitly lists it as the first thing to cut under time
  constraints, and actively warns against wrapping something in WASM that
  a skill + the native HTTP tool already does correctly — this was a
  deliberate scope decision, not an oversight.
- **Sandbox only for Pix.** The Pluggy integration is built and tested
  against Pluggy's sandbox connector, by design — a real bank connection
  is optional and was never required for this to be a genuine, complete
  integration.

## Where everything is

```
zeroclaw-data/config.toml.example   config template (real config.toml is gitignored - has secrets)
zeroclaw-data/shared/sops/          the FALOU->PROVOU/NÃO PROVOU verification procedures
zeroclaw-data/shared/skills/        owner-facing capabilities (invoice, Pix note, etc.)
zeroclaw-data/shared/maintenance/   zero-LLM-cost cron jobs (stale-run cleanup, ledger reconciliation)
pix-rail/                    the Pluggy (Open Finance) integration + one-time bank-connection page
tooling/actions-server/      the Solana Actions (Blinks) HTTP server for Layer 1
tooling/subscriptions-test/  isolated devnet tests for the recurring-delegation program calls
landing/                     the public landing page (static HTML/CSS, no build step)
docs/                        the Docusaurus documentation site
```

## Authors

- **Cecília Galvão** — [@ceciliagalvaoo](https://github.com/ceciliagalvaoo)
- **Pablo Azevedo** — [@zzaved](https://github.com/zzaved)
