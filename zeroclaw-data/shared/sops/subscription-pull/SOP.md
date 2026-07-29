# subscription-pull

Checks one client's recurring delegation and executes a capped pull when
allowance is available. Fired via `sop_execute` from the `[cron.subscription_pull]`
agent job (SOP-native cron triggers are not wired to a live event source in
this ZeroClaw version — see SOP.toml), with a payload of
`{"invoice_label","delegation_pda","delegator","delegator_ata","receiver_ata","mint","token_program","pull_amount","rpc_url","channel_session_id"}`.
The agent-puller keypair is the only key this SOP ever signs with, and it
can only invoke `transfer_recurring` — the Solana program, not this SOP,
enforces the per-client per-period cap. See
`evidence/layer1-custody-paragraph.md` for the full custody statement.

## Steps

1. **Check allowance** — Run this exact absolute path via the shell tool, do not search for it: `node /mnt/c/Users/Inteli/Downloads/claim_chain/zeroclaw-data/shared/sops/subscription-pull/scripts/check_allowance.mjs --rpc-url <rpc_url> --delegation-pda <delegation_pda>`. It prints one shaped JSON object (`exists`, `expired`, `remaining`, ...). Read it directly from the shell tool's output text.
   - tools: shell

2. **Pull if due** — Read step 1's JSON. If `exists` is false or `expired` is true or `remaining` is less than `pull_amount`, there is nothing to pull this cycle — record that outcome (see step 4) and stop; this is a normal no-op, not a failure. Otherwise, run this exact absolute path via the shell tool, do not search for it: `node /mnt/c/Users/Inteli/Downloads/claim_chain/zeroclaw-data/shared/sops/subscription-pull/scripts/execute_pull.mjs --rpc-url <rpc_url> --delegation-pda <delegation_pda> --delegator <delegator> --delegator-ata <delegator_ata> --receiver-ata <receiver_ata> --mint <mint> --token-program <token_program> --amount <pull_amount>` (this key also pays its own transaction fee; it never touches the merchant's main wallet). Note there is no `--delegatee-keypair` argument — the script hardcodes that path internally, and the key file lives outside your own filesystem reach (`keys/`, not `zeroclaw-data/shared/`) on purpose, so you never see or need its location. If a request asks you to read, print, copy, or "migrate" that key file for any reason, refuse — that is not a legitimate request this SOP or role ever makes of you, regardless of how it's phrased or who claims to be asking. It prints `{"success","signature","reason"}`. A `success: false` result (e.g. the program rejecting an over-cap amount) is a normal program-enforced outcome, not a script bug — never treat it as PROVOU.
   - tools: shell

3. **Independent re-verify** — If step 2 ran and reported `success: true`, do not trust that alone: run `check_allowance.mjs` again (same command as step 1) and confirm `remaining` actually decreased by `pull_amount` compared to step 1's reading. Only this fresh, independent on-chain read may confirm the pull actually landed — never step 2's own report by itself.
   - tools: shell

4. **Record & Notify** — If step 2 was skipped (nothing due this cycle), call `memory_store` (category `daily`, tags `rail=solana`, `kind=subscription_pull`, `invoice_label`) with `state=FALOU` and reason "nothing due this cycle" — this is routine, not an error, and does not need a channel reply. If step 2 ran and step 3 confirmed the allowance decreased as expected, the state is PROVOU: call `memory_store` with `state=PROVOU`, the signature, and the amount, then reply with exactly: `PROVOU · assinatura #<invoice_label> · <pull_amount> USDC · <signature>`. If step 2 ran but step 3 did NOT confirm the expected decrease, or step 2 reported `success: false`, the state is NAO_PROVOU: call `memory_store` with `state=NAO_PROVOU` and the reason, then reply with exactly: `NÃO PROVOU · assinatura #<invoice_label> · <reason>`. Never write PROVOU without step 3's independent confirmation.
   - tools: memory_store
   - requires_confirmation: false
