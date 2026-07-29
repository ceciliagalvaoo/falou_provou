---
name: solana-pay-invoice
description: >-
  Gera cobranças Solana Pay (USDC): cria reference key, monta a URL solana:, registra fatura em memória com estado FALOU. Use quando o dono pedir para cobrar um cliente em USDC/SOL.
version: 0.1.0
---

# Solana Pay Invoice

Use this skill when the owner asks to bill/charge a client in USDC or SOL
(e.g. "cobrar 180 usdc do cliente Marek"). It only ever produces a **FALOU**
(claimed) entry — this skill never marks anything as paid. Proof only ever
comes from the `invoice-watch` SOP querying the chain directly.

## Steps

1. Extract `amount`, `client`, and an `invoice_id` from the request. If the
   owner does not give an invoice id, generate a short sequential one (check
   `memory_recall` category `daily` tag `rail=solana` for the highest prior
   id and increment it; start at 1 if none exist).

2. Before creating anything, call `memory_recall` for key `invoice_<invoice_id>_solana`.
   **If it already exists, stop — do not generate a new reference key.** A
   second reference for the same invoice id silently orphans the first one:
   if a client already has the first QR/link and pays it, the system would
   monitor only the new reference and never find that payment. Instead, tell
   the owner the invoice id is already in use, show its current state
   (`memory_recall` key `invoice_<invoice_id>_verification` if present,
   otherwise it is still FALOU), and ask whether they want a different
   invoice id or to resend the existing `solana_pay_url`.

   If the owner instead explicitly asks to re-check/re-verify an existing
   FALOU invoice (e.g. "verifica a fatura teste de novo", "já paguei,
   confere"), do **not** re-run step 3 at all — reuse the exact
   `reference_pubkey` and other fields already stored under
   `invoice_<invoice_id>_solana` and go straight to step 6 with those
   values. This is also the correct recovery if a prior `sop_execute` call
   is suspected to have used a different reference than the one actually
   shown to the client (skip to step 6 using the stored memory record as
   the single source of truth, never a value from conversation history).

3. Run the invoice script via the shell tool (use this exact absolute path,
   do not search for it):
   ```
   python3 /mnt/c/Users/Inteli/Downloads/claim_chain/zeroclaw-data/shared/skills/solana-pay-invoice/scripts/create_invoice.py \
     --amount <amount> --client "<client>" --invoice-id <invoice_id> \
     --workspace /mnt/c/Users/Inteli/Downloads/claim_chain/zeroclaw-data/agents/dono/workspace
   ```
   It prints one JSON object: `reference_pubkey`, `solana_pay_url`,
   `qr_image_path` (may be null if QR rendering failed — that is not an
   error, the text URL still works), `merchant_wallet`, `usdc_mint`,
   `rpc_url`, and `state: "FALOU"`.

   **If this call is blocked or errors, do not just run it again and move
   on with a fresh result — every invocation generates a brand-new, random
   `reference_pubkey`, so two invocations for the same invoice id produce
   two DIFFERENT references.** A real incident: the shell call was blocked
   once (a security-policy path issue, since fixed), the agent retried and
   got a second, different reference, then used the *first* attempt's
   reference for `memory_store`/the reply shown to the client but the
   *second* attempt's reference for `sop_execute` — so the SOP was watching
   a reference nobody would ever pay to, and the invoice would have falsely
   timed out to NÃO PROVOU no matter what the client actually did. If a
   retry is genuinely needed, only the LAST successful invocation's output
   is real — copy its `reference_pubkey` into *both* step 4 and step 6, and
   never let an earlier attempt's value leak into either one.

4. Call `memory_store` (category `daily`, tags `rail=solana`, `invoice_id`,
   `state=FALOU`) with the full JSON from step 3, verbatim. This is the only
   record that should ever exist for this invoice until `invoice-watch`
   changes it.

5. Reply to the owner/client in the channel with the invoice, always
   including the raw `solana_pay_url` as text (a wallet app can open a
   `solana:` URI directly, or the recipient can paste it), and attach the
   PNG at `qr_image_path` if it is not null. State the amount and that the
   status is **FALOU** — never imply it is paid.

   Known issue: after a long tool-heavy turn like this one, the reply
   occasionally arrives as a generic "I couldn't produce a visible reply"
   message instead of this text (an upstream empty-completion issue, not a
   data problem — `invoice_<id>_solana` in memory is still correct either
   way). If that happens, a follow-up like "qual o status da fatura <id>?"
   always answers correctly from memory.

6. Immediately fire verification with the `sop_execute` tool:
   ```
   // tool: sop_execute
   // args: { "name": "invoice-watch", "payload": "{\"invoice_id\":\"<id>\",\"reference_pubkey\":\"<ref>\",\"amount\":\"<amount>\",\"usdc_mint\":\"<mint>\",\"merchant_wallet\":\"<wallet>\",\"rpc_url\":\"<rpc_url>\",\"client\":\"<client>\",\"timeout_secs\":900}" }
   ```
   Do not wait for it synchronously — the run polls in the background and
   reports PROVOU or NÃO PROVOU on its own via the `invoice-watch` SOP (same
   known reply-delivery issue as step 5 can apply to that report too).

## The rule this skill must never break

Nothing this skill does may ever set an entry's state to anything other than
`FALOU`. If a client sends a payment screenshot, a PDF receipt, or simply
says "já paguei" in the same conversation, do not re-run this skill to
"confirm" it and do not call `memory_store` with any state other than
`FALOU`/`NÃO PROVOU` sourced from this skill. Only `invoice-watch`'s own
`memory_store` call (after a real `getTransaction` check) may write `PROVOU`.
If asked about payment status, answer by calling `memory_recall`, not by
trusting what the person just said.
