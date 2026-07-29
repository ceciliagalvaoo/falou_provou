# invoice-watch

Verifies a single Solana Pay invoice against the chain directly. This SOP is
the only thing in the product allowed to move a ledger entry into PROVOU —
never a document, a screenshot, or a claim in the conversation. Fired via
`sop_execute` with a payload of `{"invoice_id","reference_pubkey","amount","usdc_mint","merchant_wallet","rpc_url","client","channel_session_id","timeout_secs"}`.

## Steps

1. **Poll & Validate** — Run this exact absolute path via the shell tool, do not search for it: `python3 /mnt/c/Users/Inteli/Downloads/claim_chain/zeroclaw-data/shared/sops/invoice-watch/scripts/poll_reference.py --reference <reference_pubkey> --amount <amount> --usdc-mint <usdc_mint> --merchant-wallet <merchant_wallet> --rpc-url <rpc_url> --timeout-secs <timeout_secs>` — the script owns the retry/backoff loop and the amount+destination validation so no partial or reused-reference signature is ever accepted, and prints one shaped JSON object (`found`, `valid`, `signature`, `reason`) to stdout. Read that JSON object directly from the shell tool's output text in this step.
   - tools: shell

2. **Independent re-verify** — Read the JSON result from step 1. If `found` is false, skip straight to step 3 with NAO_PROVOU (timeout) — there is no signature to re-check. If `found` is true, **do not trust step 1's `valid` field yet** — run this exact absolute path via the shell tool, do not search for it, passing step 1's own `signature` value: `python3 /mnt/c/Users/Inteli/Downloads/claim_chain/zeroclaw-data/shared/sops/invoice-watch/scripts/verify_signature.py --signature <signature> --amount <amount> --usdc-mint <usdc_mint> --merchant-wallet <merchant_wallet> --rpc-url <rpc_url>`. This queries the chain a second time, completely independently of step 1's report, and is the actual gate for PROVOU — it exists specifically so that a mistaken or fabricated step-1 result (a model reporting `valid: true` without actually having checked) cannot reach PROVOU on its own say-so. Only step 3 acts on this script's own `valid` field, never on step 1's.
   - tools: shell

3. **Record & Notify** — If step 2 was skipped (timeout) or step 2's `valid` is false, the state is NAO_PROVOU: call `memory_store` with `state=NAO_PROVOU` and the `reason` (from step 2 if it ran, otherwise step 1's timeout reason), then reply with exactly: `NÃO PROVOU · fatura #<invoice_id> · <reason>`. If step 2's `valid` is true, the state is PROVOU: call `memory_store` (category `daily`, tags `rail=solana`, `invoice_id`, `state=PROVOU`) with the invoice id, amount, signature, and destination, then reply with exactly: `PROVOU · fatura #<invoice_id> · <amount> USDC · <signature>`. Never write PROVOU on step 1's `valid` field alone — only step 2's independent re-check may authorize it.
   - tools: memory_store
   - requires_confirmation: false
