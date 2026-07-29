// Enumerates every active recurring delegation naming our agent-puller key
// as delegatee, via the SDK's own indexed lookup (fetchDelegationsByDelegatee)
// rather than any client-side bookkeeping of "which clients we know about" -
// the chain itself is the source of truth for who has authorized this key,
// exactly like everything else in this project.
//
// Filters to `kind === "recurring"` (the only delegation model this product
// uses - see evidence/layer1-custody-paragraph.md) and to the expected mint,
// so a differently-configured delegation naming this same key for another
// token never gets treated as one of our merchant's clients.
//
// Prints one JSON array, each entry shaped exactly like subscription-pull's
// own per-client payload fields (minus invoice_label, which the caller
// assigns): {"delegation_pda","delegator","delegator_ata","pull_amount","expiry_ts"}
//
// Optional --pick-one-every-ms <N>: instead of the full array, prints a
// single-element array holding exactly one deterministically-rotated entry,
// selected by floor(Date.now()/N) mod count against a stably-sorted list
// (sorted by delegation_pda, so the rotation order doesn't depend on RPC
// response ordering, which is not guaranteed stable call-to-call).
//
// This exists because dispatching one `sop_execute` per client in the SAME
// cron-triggered agent turn was found (2026-07-28, real production data,
// not a hypothetical) to silently orphan most clients: the turn has enough
// tool-call budget to fully drive only some of the runs it starts through
// their 4 steps, and nothing ever resumes the rest - they sit at step 1
// forever with zero step_results, invisible until someone goes looking in
// runs.db directly. One run per cron tick, cycling through clients over
// time, is the fix: it reuses the exact single-client flow already proven
// reliable (see evidence/layer1-custody-paragraph.md's Addendum), just
// driven by the cron's own recurrence instead of a loop inside one turn.

import { createSolanaRpc, address } from "@solana/kit";
import { fetchDelegationsByDelegatee } from "@solana/subscriptions";
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";

function arg(name, required = true) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || !process.argv[idx + 1]) {
    if (required) throw new Error(`missing --${name}`);
    return null;
  }
  return process.argv[idx + 1];
}

async function main() {
  const rpcUrl = arg("rpc-url");
  const delegatee = address(arg("delegatee"));
  const mint = address(arg("mint"));
  const pickOneEveryMs = arg("pick-one-every-ms", false);

  const rpc = createSolanaRpc(rpcUrl);
  const all = await fetchDelegationsByDelegatee(rpc, delegatee);

  const now = BigInt(Math.floor(Date.now() / 1000));
  const results = [];

  for (const d of all) {
    if (d.kind !== "recurring") continue;
    if (d.data.mint !== mint) continue;
    if (d.data.expiryTs !== 0n && now > d.data.expiryTs) continue; // expired, nothing to pull, skip listing it

    const delegator = d.data.header.delegator;
    const [delegatorAta] = await findAssociatedTokenPda({ owner: delegator, mint, tokenProgram: TOKEN_PROGRAM_ADDRESS });

    results.push({
      delegation_pda: d.address,
      delegator,
      delegator_ata: delegatorAta,
      pull_amount: d.data.amountPerPeriod.toString(),
      expiry_ts: d.data.expiryTs.toString(),
    });
  }

  if (pickOneEveryMs) {
    if (results.length === 0) {
      console.log(JSON.stringify([]));
      return;
    }
    results.sort((a, b) => (a.delegation_pda < b.delegation_pda ? -1 : 1));
    const rotateMs = Number(pickOneEveryMs);
    const idx = Math.floor(Date.now() / rotateMs) % results.length;
    console.log(JSON.stringify([results[idx]]));
    return;
  }

  console.log(JSON.stringify(results));
}

main().catch((err) => {
  console.log(JSON.stringify({ error: `rpc/decode error: ${err.message}` }));
  process.exit(1);
});
