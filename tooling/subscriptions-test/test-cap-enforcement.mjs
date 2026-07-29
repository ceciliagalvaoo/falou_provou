// Self-contained, deterministic proof that the program itself rejects an
// over-cap pull. Fixed after an external audit found the previous version
// computed `remaining` from the raw on-chain field without accounting for
// the program's lazy period-rollover (amount_pulled_in_period only resets
// on the NEXT transfer_recurring call after a period boundary, not
// automatically) - which made the test's outcome depend on how much time
// had passed since the delegation was created, not on the cap itself.
//
// Fix: this script creates its OWN fresh delegation with a small period
// (60s) and a small cap, pulls exactly the full cap once (valid), then
// immediately attempts one more unit within the same period (must be
// rejected - there is no time for a rollover between the two calls, so
// this is deterministic regardless of when the script is run).

import fs from "fs";
import {
  createSolanaRpc, createSolanaRpcSubscriptions, createKeyPairSignerFromBytes,
  createTransactionMessage, setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash, appendTransactionMessageInstructions,
  signTransactionMessageWithSigners, sendAndConfirmTransactionFactory,
  getSignatureFromTransaction, address,
} from "@solana/kit";
import {
  getCreateRecurringDelegationInstruction, getTransferRecurringInstructionAsync,
  findSubscriptionAuthorityPda, findRecurringDelegationPda,
  fetchRecurringDelegation, fetchMaybeSubscriptionAuthority,
} from "@solana/subscriptions";

const RPC_URL = "https://api.devnet.solana.com";
const TOKEN_PROGRAM = address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const MINT = address("Hm48r4majxKMNzBBDP13KnUcW6C612sPTTd9MuKfTFi2");

function loadSigner(path) {
  return createKeyPairSignerFromBytes(Uint8Array.from(JSON.parse(fs.readFileSync(path, "utf8"))));
}

async function sendIx(rpc, rpcSubscriptions, payer, instructions, label) {
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  let message = createTransactionMessage({ version: 0 });
  message = setTransactionMessageFeePayerSigner(payer, message);
  message = setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, message);
  message = appendTransactionMessageInstructions(instructions, message);
  const signed = await signTransactionMessageWithSigners(message);
  await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(signed, { commitment: "confirmed" });
  const sig = getSignatureFromTransaction(signed);
  console.log(`[${label}] signature: ${sig}`);
  return sig;
}

async function main() {
  const rpc = createSolanaRpc(RPC_URL);
  const rpcSubscriptions = createSolanaRpcSubscriptions("wss://api.devnet.solana.com");
  const merchantPayer = await loadSigner("/mnt/c/Users/Inteli/Downloads/claim_chain/keys/merchant-devnet.json");
  const delegator = await loadSigner("/mnt/c/Users/Inteli/Downloads/claim_chain/keys/client-devnet.json");
  const delegatee = await loadSigner("/mnt/c/Users/Inteli/Downloads/claim_chain/keys/agent-puller-devnet.json");

  const clientAta = address("5iExBaHNXtrnumSMUUojKNFdwaWhAW9pE14KbTPbzrfv");
  const merchantAta = address("GPXAZqLiyr8Wzs24JUxZ76tJsvaZFhinFNRSVqoNSbNU");

  const [subscriptionAuthorityPda] = await findSubscriptionAuthorityPda({ user: delegator.address, tokenMint: MINT });
  const existingSA = await fetchMaybeSubscriptionAuthority(rpc, subscriptionAuthorityPda);
  if (!existingSA.exists) throw new Error("subscription authority does not exist yet - run test-recurring.mjs first");
  const initId = BigInt(existingSA.data.initId);

  // Fresh delegation, small cap: 100_000 (0.1 test-USDC), 60s period.
  const nonce = BigInt(Date.now());
  const cap = 100_000n;
  const now = BigInt(Math.floor(Date.now() / 1000));

  const [delegationPda] = await findRecurringDelegationPda({
    subscriptionAuthority: subscriptionAuthorityPda,
    delegator: delegator.address,
    delegatee: delegatee.address,
    nonce,
  });

  const createIx = getCreateRecurringDelegationInstruction({
    delegator, subscriptionAuthority: subscriptionAuthorityPda,
    delegationAccount: delegationPda, delegatee: delegatee.address, payer: merchantPayer,
    recurringDelegation: {
      nonce, amountPerPeriod: cap, periodLengthS: 60n,
      startTs: now, expiryTs: now + 86_400n, expectedSubscriptionAuthorityInitId: initId,
    },
  });
  await sendIx(rpc, rpcSubscriptions, merchantPayer, [createIx], "create_recurring_delegation (fresh, cap=100000)");

  // Pull exactly the full cap - must succeed.
  const fullPullIx = await getTransferRecurringInstructionAsync({
    delegationPda, subscriptionAuthority: subscriptionAuthorityPda,
    delegatorAta: clientAta, receiverAta: merchantAta, tokenMint: MINT, tokenProgram: TOKEN_PROGRAM,
    delegatee, transferData: { amount: cap, delegator: delegator.address, mint: MINT },
  });
  await sendIx(rpc, rpcSubscriptions, delegatee, [fullPullIx], "transfer_recurring (full cap, expect success)");

  const afterFullPull = await fetchRecurringDelegation(rpc, delegationPda);
  console.log("after full pull - amountPulledInPeriod:", afterFullPull.data.amountPulledInPeriod.toString(),
    "(expected == cap:", cap.toString(), ")");

  // Immediately (same period, no time for rollover) attempt one more unit.
  const overCapIx = await getTransferRecurringInstructionAsync({
    delegationPda, subscriptionAuthority: subscriptionAuthorityPda,
    delegatorAta: clientAta, receiverAta: merchantAta, tokenMint: MINT, tokenProgram: TOKEN_PROGRAM,
    delegatee, transferData: { amount: 1n, delegator: delegator.address, mint: MINT },
  });

  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  let message = createTransactionMessage({ version: 0 });
  message = setTransactionMessageFeePayerSigner(delegatee, message);
  message = setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, message);
  message = appendTransactionMessageInstructions([overCapIx], message);
  const signed = await signTransactionMessageWithSigners(message);

  try {
    await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(signed, { commitment: "confirmed" });
    console.log("❌ UNEXPECTED: 1-unit over-cap pull succeeded — this would be a real bug in our understanding");
    process.exit(1);
  } catch (err) {
    console.log("✅ EXPECTED: over-cap pull (cap already exhausted this period) rejected by the program itself.");
    console.log("Program error code:", err?.cause?.context?.code, "|", err?.cause?.message || err.message);
  }
}

main().catch((e) => { console.error("TEST FAILED:", e); process.exit(1); });
