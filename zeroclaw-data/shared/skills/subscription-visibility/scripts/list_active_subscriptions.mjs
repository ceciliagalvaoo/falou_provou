// Owner-facing visibility into every active recurring delegation naming
// our agent-puller key - read-only, no signing, no state changes. Reuses
// the same fetchDelegationsByDelegatee lookup and lazy-period-rollover
// math already proven in subscription-pull's own scripts (see
// evidence/layer1-custody-paragraph.md), so the numbers shown here always
// match what the pull loop itself would compute - never a second,
// possibly-drifting implementation of the same on-chain read.
//
// Prints one JSON array, each entry:
// {"delegation_pda","delegator","amount_per_period","remaining_this_period",
//  "period_length_s","expiry_ts","expired"}

import { createSolanaRpc, address } from "@solana/kit";
import { fetchDelegationsByDelegatee } from "@solana/subscriptions";

function arg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || !process.argv[idx + 1]) throw new Error(`missing --${name}`);
  return process.argv[idx + 1];
}

async function main() {
  const rpcUrl = arg("rpc-url");
  const delegatee = address(arg("delegatee"));
  const mint = address(arg("mint"));

  const rpc = createSolanaRpc(rpcUrl);
  const all = await fetchDelegationsByDelegatee(rpc, delegatee);
  const now = BigInt(Math.floor(Date.now() / 1000));

  const results = [];
  for (const d of all) {
    if (d.kind !== "recurring") continue;
    if (d.data.mint !== mint) continue;

    const expired = d.data.expiryTs !== 0n && now > d.data.expiryTs;
    const periodEnd = d.data.currentPeriodStartTs + d.data.periodLengthS;
    const periodRolledOver = now >= periodEnd;
    const effectivePulled = periodRolledOver ? 0n : d.data.amountPulledInPeriod;
    const remaining = expired ? 0n : d.data.amountPerPeriod - effectivePulled;

    results.push({
      delegation_pda: d.address,
      delegator: d.data.header.delegator,
      amount_per_period: d.data.amountPerPeriod.toString(),
      remaining_this_period: remaining.toString(),
      period_length_s: d.data.periodLengthS.toString(),
      expiry_ts: d.data.expiryTs.toString(),
      expired,
    });
  }

  console.log(JSON.stringify(results));
}

main().catch((err) => {
  console.log(JSON.stringify({ error: `rpc/decode error: ${err.message}` }));
  process.exit(1);
});
