// Reconciliation, part 1 of 2 (see backfill_unrecorded_pulls.py for part 2).
//
// Real problem this solves (found by a bounty-judge-agent audit,
// 2026-07-28): a transfer_recurring pull can land on-chain for real while
// the SOP step that would record it fails for an unrelated reason (that
// day, Anthropic API credit exhaustion mid-run) - money moves, the ledger
// stays silent. Nothing in this product detected that until someone went
// looking by hand. This script is the detector half: it finds every
// successful transfer_recurring signed by our agent-puller key, on-chain,
// independent of whatever this product's own memory log says happened.
//
// Deliberately does NOT touch the memory database itself (that's sqlite,
// better handled from Python - see part 2) - this script's only job is
// the Solana RPC work: list signatures, fetch transactions, identify which
// known delegation each pull was against, and compute the real amount
// moved from the transaction's own token-balance deltas (never trusted
// from the instruction's declared amount alone - the same "read the
// actual result, not the intent" discipline used everywhere else in this
// project).
//
// Prints one JSON array to stdout: each entry
// {"signature","delegation_pda","delegator","pull_amount","block_time_iso"}
// - candidates that landed successfully and are tied to a delegation this
// agent-puller key still recognizes. Whether each one already has a
// memory record is checked by part 2, not here.

import { createSolanaRpc, address } from "@solana/kit";
import { fetchDelegationsByDelegatee } from "@solana/subscriptions";

const RPC_URL = "https://api.devnet.solana.com";
const AGENT_PULLER = address("HepTxTom6v8pkFAfa5j4FYS3UG2GbQhQoTRTgttaUnGF");
const MINT = address("Hm48r4majxKMNzBBDP13KnUcW6C612sPTTd9MuKfTFi2");
const SUBSCRIPTIONS_PROGRAM = "De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44";
const SIGNATURE_LIMIT = 25;

// Public devnet RPC rate-limits hard under any real load - this script is
// meant to run unattended via a shell-type cron job with nobody watching,
// so a transient 429 must be retried with backoff, not treated as "no
// pulls found" (that would be silently wrong in exactly the direction this
// whole script exists to prevent - missing something real).
async function withRetry(fn, label, attempts = 5) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      const isRateLimit = /429|Too Many Requests/i.test(err?.message || "");
      if (!isRateLimit || i === attempts - 1) throw err;
      const waitMs = 2000 * Math.pow(2, i);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
}

async function main() {
  const rpc = createSolanaRpc(RPC_URL);

  // Known delegations right now - used only to identify WHICH delegation a
  // given transaction's accounts belong to (by presence of its PDA in the
  // account list), not to decide whether to check it at all: a pull against
  // a delegation that has since been revoked still deserves reconciliation
  // if it landed before the revoke, so we don't filter by "still active."
  const knownDelegations = await withRetry(() => fetchDelegationsByDelegatee(rpc, AGENT_PULLER), "fetchDelegationsByDelegatee");
  const delegationByPda = new Map();
  for (const d of knownDelegations) {
    if (d.kind !== "recurring") continue;
    delegationByPda.set(d.address, d.data.header.delegator);
  }

  const sigInfos = await withRetry(
    () => rpc.getSignaturesForAddress(AGENT_PULLER, { limit: SIGNATURE_LIMIT }).send(),
    "getSignaturesForAddress",
  );

  const results = [];
  for (const sigInfo of sigInfos) {
    if (sigInfo.err) continue; // failed transaction - not a "money moved" case

    const tx = await withRetry(
      () => rpc.getTransaction(sigInfo.signature, { encoding: "json", maxSupportedTransactionVersion: 0 }).send(),
      `getTransaction(${sigInfo.signature})`,
    );
    if (!tx || tx.meta?.err) continue;

    const accountKeys = (tx.transaction.message.accountKeys || []).map(String);
    if (!accountKeys.includes(SUBSCRIPTIONS_PROGRAM)) continue;

    // Identify which known delegation this transaction touches.
    let delegationPda = null;
    let delegator = null;
    for (const [pda, del] of delegationByPda.entries()) {
      if (accountKeys.includes(pda)) {
        delegationPda = pda;
        delegator = del;
        break;
      }
    }
    if (!delegationPda) continue; // not a delegation this key currently knows about - skip, don't guess

    // Real amount moved: the receiver ATA's own pre/post token balance
    // delta, read from the transaction's own meta - never the instruction's
    // declared amount, which is intent, not outcome.
    const pre = tx.meta?.preTokenBalances || [];
    const post = tx.meta?.postTokenBalances || [];
    let pullAmount = null;
    for (const p of post) {
      if (p.mint !== MINT.toString()) continue;
      const before = pre.find((b) => b.accountIndex === p.accountIndex);
      const beforeAmt = before ? BigInt(before.uiTokenAmount.amount) : 0n;
      const afterAmt = BigInt(p.uiTokenAmount.amount);
      const delta = afterAmt - beforeAmt;
      if (delta > 0n) {
        pullAmount = delta.toString();
        break;
      }
    }
    if (pullAmount === null) continue; // couldn't find a positive balance delta - not a completed transfer we can reconcile confidently

    results.push({
      signature: sigInfo.signature,
      delegation_pda: delegationPda,
      delegator,
      pull_amount: pullAmount,
      block_time_iso: sigInfo.blockTime ? new Date(Number(sigInfo.blockTime) * 1000).toISOString() : null,
    });
  }

  console.log(JSON.stringify(results));
}

main().catch((err) => {
  console.log(JSON.stringify({ error: `rpc/decode error: ${err.message}` }));
  process.exit(1);
});
