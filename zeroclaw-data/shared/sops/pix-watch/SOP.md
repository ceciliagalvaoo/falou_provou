# pix-watch

Checks one previously-claimed (FALOU) Pix receipt against the real bank
statement, read directly from Pluggy — never from the owner's own message,
a screenshot, or a forwarded bank notification. Fired via `sop_execute`
with a payload of `{"claim_key","amount_brl","account_id","claimed_at","sender_name"}`
(`claim_key` is the memory key the FALOU entry was stored under, so this
SOP knows exactly which claim it is confirming or denying).

Matches by amount + a time window against transactions on/after the claim
was made, not by any "Pix" label — the sandbox connector's synthetic data
does not label transactions by payment method, and real bank statement
text for Pix varies too much to rely on universally either (see
`pix-rail/scripts/pix_watch.mjs`'s own comment for why this is a deliberate
design choice, not a shortcut).

## Steps

1. **Check the real statement** — Run this exact absolute path via the shell tool, do not search for it: `node /mnt/c/Users/Inteli/Downloads/claim_chain/zeroclaw-data/shared/sops/pix-watch/scripts/check_pix_claim.mjs --account-id <account_id> --amount <amount_brl> --since <claimed_at>`. It prints one shaped JSON object: `{"found","transaction_id","amount","date","description"}`, `{"found":false}`, or `{"found":false,"error":"..."}`. This script's verdict is the only thing that decides whether the Pix landed — never treat the owner's original claim, or your own memory of a prior run, as evidence by itself. **The presence of an `error` key matters — read it before deciding step 2's branch.**
   - tools: shell

2. **Record** — Three distinct outcomes, never collapse them into two:
   - `found: true` → **PROVOU**. Call `memory_store` (category `daily`, key `<claim_key>_verification`, tags `rail=pix`, `kind=pix_receipt`) with `{"state":"PROVOU","claim_key","amount_brl","transaction_id","verified_at"}`, then reply with exactly: `PROVOU · Pix · R$ <amount_brl> · <transaction_id>`.
   - `found: false` with **no** `error` key → the statement was genuinely read and nothing matched. This is **NÃO PROVOU** — the source was consulted and did not confirm it. Call `memory_store` with `{"state":"NAO_PROVOU","claim_key","amount_brl","reason":"nenhuma transação correspondente encontrada no extrato real"}`, then reply with exactly: `NÃO PROVOU · Pix · R$ <amount_brl> · nenhuma transação correspondente encontrada no extrato real`.
   - `found: false` **with** an `error` key → verification could not run at all (network/API failure). This is **not** NÃO PROVOU — writing that would claim the source was checked and denied it, which is stronger and false. Leave the claim's own state at FALOU: do not overwrite `<claim_key>`'s memory entry. Instead call `memory_store` with a distinct key `<claim_key>_verification_error`, `{"state":"FALOU","claim_key","amount_brl","note":"verificação não pôde ser concluída - tentar novamente","error":"<the error string>"}`, then reply with exactly: `⚠️ Não foi possível verificar agora (erro técnico) · Pix · R$ <amount_brl> · continua como FALOU, tentarei de novo`.
   - Never write PROVOU without step 1's `found: true` — a document, a message, or the owner insisting it happened is never sufficient on its own, exactly like every other rail in this product.
   - tools: memory_store
   - requires_confirmation: false
