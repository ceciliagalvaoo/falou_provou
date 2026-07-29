// Reads a RecurringDelegation account and computes the REAL, current
// remaining allowance - replicating the program's lazy period-rollover
// logic client-side, since the on-chain amount_pulled_in_period field only
// resets on the next transfer_recurring call, not automatically at the
// period boundary. Getting this wrong would either under-report allowance
// (harmless) or over-report it (would cause a rejected pull, never a false
// PROVOU - the program is still the final gate).
//
// Prints one JSON object: {"exists","expired","period_rolled_over",
// "amount_per_period","effective_pulled_in_period","remaining","expiry_ts",
// "current_period_start_ts","period_length_s"}

import { createSolanaRpc, address } from "@solana/kit";
import { fetchMaybeRecurringDelegation } from "@solana/subscriptions";

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
  const delegationPda = address(arg("delegation-pda"));

  const rpc = createSolanaRpc(rpcUrl);
  const maybe = await fetchMaybeRecurringDelegation(rpc, delegationPda);

  if (!maybe.exists) {
    console.log(JSON.stringify({ exists: false, reason: "delegation account not found (revoked or never created)" }));
    return;
  }

  const d = maybe.data;
  const now = BigInt(Math.floor(Date.now() / 1000));
  const periodEnd = d.currentPeriodStartTs + d.periodLengthS;
  const periodRolledOver = now >= periodEnd;
  const expired = d.expiryTs !== 0n && now > d.expiryTs;
  const effectivePulled = periodRolledOver ? 0n : d.amountPulledInPeriod;
  const remaining = expired ? 0n : d.amountPerPeriod - effectivePulled;

  console.log(JSON.stringify({
    exists: true,
    expired,
    period_rolled_over: periodRolledOver,
    amount_per_period: d.amountPerPeriod.toString(),
    effective_pulled_in_period: effectivePulled.toString(),
    remaining: remaining.toString(),
    expiry_ts: d.expiryTs.toString(),
    current_period_start_ts: d.currentPeriodStartTs.toString(),
    period_length_s: d.periodLengthS.toString(),
  }));
}

main().catch((err) => {
  console.log(JSON.stringify({ exists: false, reason: `rpc/decode error: ${err.message}` }));
  process.exit(1);
});
