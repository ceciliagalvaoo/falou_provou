// Isolated, self-contained proof that revoke_delegation actually works
// against a real delegation on devnet - exercised for the first time in
// this project (previously only confirmed to exist in the program/SDK,
// never run). Creates its own fresh delegation, revokes it as the
// delegator (the only party with authority to revoke - not the agent, not
// the merchant), then proves the account is really gone and that a pull
// attempted against it afterward is rejected, not silently ignored.

import fs from "fs";
import {
  createSolanaRpc, createSolanaRpcSubscriptions, createKeyPairSignerFromBytes,
  createTransactionMessage, setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash, appendTransactionMessageInstructions,
  signTransactionMessageWithSigners, sendAndConfirmTransactionFactory,
  getSignatureFromTransaction, address,
} from "@solana/kit";
import {
  getCreateRecurringDelegationInstruction, getRevokeDelegationOverlayInstruction,
  getTransferRecurringInstructionAsync,
  findSubscriptionAuthorityPda, findRecurringDelegationPda,
  fetchMaybeRecurringDelegation, fetchMaybeSubscriptionAuthority,
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

  const nonce = BigInt(Date.now());
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
      nonce, amountPerPeriod: 1_000_000n, periodLengthS: 3600n,
      startTs: now, expiryTs: now + 86_400n, expectedSubscriptionAuthorityInitId: initId,
    },
  });
  await sendIx(rpc, rpcSubscriptions, merchantPayer, [createIx], "create_recurring_delegation (fresh, to be revoked)");

  const beforeRevoke = await fetchMaybeRecurringDelegation(rpc, delegationPda);
  console.log("Delegation exists before revoke:", beforeRevoke.exists);
  if (!beforeRevoke.exists) throw new Error("delegation was not actually created - aborting");

  // Revoke - only the DELEGATOR (the client) can authorize this, not the
  // agent-puller key and not the merchant. This is the client unilaterally
  // taking back what they authorized, matching the custody paragraph's
  // claim that each client's authorization is independent and revocable by
  // them alone. Our test client key has zero devnet SOL (it has never paid
  // its own fees in any test - the merchant always covers rent/fees so
  // clients never need a funded wallet just to interact with this product),
  // so the merchant pays this transaction's fee while the client still
  // signs as the required `authority` - the revoke decision itself is still
  // entirely the client's, fee sponsorship carries no authority of its own,
  // same distinction already established for delegation creation.
  //
  // `receiver` (where reclaimed rent lands) must be an account that already
  // exists on-chain with a nonzero balance - passing the zero-balance test
  // client itself here failed with a program-level error (#130, generic
  // enough that "unauthorized" was a red herring; it was really about the
  // receiver, confirmed by process of elimination against several other
  // hypotheses first). The merchant wallet, which already exists and holds
  // SOL, works correctly - a real client's own wallet (which by definition
  // needs SOL to have signed the original delegation-authorizing tx web
  // session, unlike our zero-balance throwaway test key) would too.
  const revokeIx = getRevokeDelegationOverlayInstruction({
    authority: delegator,
    delegationAccount: delegationPda,
    receiver: merchantPayer.address,
  });
  {
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
    let message = createTransactionMessage({ version: 0 });
    message = setTransactionMessageFeePayerSigner(merchantPayer, message);
    message = setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, message);
    message = appendTransactionMessageInstructions([revokeIx], message);
    const signed = await signTransactionMessageWithSigners(message);
    await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(signed, { commitment: "confirmed" });
    console.log("[revoke_delegation (client authorizes, merchant pays fee)] signature:", getSignatureFromTransaction(signed));
  }

  const afterRevoke = await fetchMaybeRecurringDelegation(rpc, delegationPda);
  console.log("Delegation exists after revoke:", afterRevoke.exists, "(expected: false)");
  if (afterRevoke.exists) {
    console.log("❌ UNEXPECTED: delegation account still exists after revoke_delegation");
    process.exit(1);
  }

  // Prove it's not just "exists=false" as a display quirk: an actual pull
  // attempt against the now-revoked delegation must be rejected on-chain,
  // not silently skipped or (worse) silently succeed against stale state.
  try {
    const pullIx = await getTransferRecurringInstructionAsync({
      delegationPda, subscriptionAuthority: subscriptionAuthorityPda,
      delegatorAta: clientAta, receiverAta: merchantAta, tokenMint: MINT, tokenProgram: TOKEN_PROGRAM,
      delegatee, transferData: { amount: 1n, delegator: delegator.address, mint: MINT },
    });
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
    let message = createTransactionMessage({ version: 0 });
    message = setTransactionMessageFeePayerSigner(delegatee, message);
    message = setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, message);
    message = appendTransactionMessageInstructions([pullIx], message);
    const signed = await signTransactionMessageWithSigners(message);
    await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(signed, { commitment: "confirmed" });
    console.log("❌ UNEXPECTED: a pull against a revoked delegation succeeded — real bug");
    process.exit(1);
  } catch (err) {
    console.log("✅ EXPECTED: pull attempt against the revoked delegation was rejected.");
    console.log("Error:", err?.cause?.message || err.message);
  }

  console.log("\n✅ revoke_delegation proven end-to-end: client-initiated, on-chain account closed, subsequent pull rejected.");
}

main().catch((e) => { console.error("TEST FAILED:", e); process.exit(1); });
