// Isolated test of the Solana "Subscriptions & Allowances" recurring-delegation
// model, BEFORE any integration into the main Claim & Chain product.
//
// Roles (matching the real product design):
//   - "delegator" = a client, authorizing the merchant's agent once.
//   - "delegatee" = the merchant's own dedicated agent-puller keypair,
//     which will later live under the ZeroClaw agent's custody.
//   - "payer"     = the merchant's main wallet, funding rent/fees so
//     the client and the agent-puller key never need their own SOL.
//
// Flow: init subscription authority -> create recurring delegation
// (cap + expiry) -> read allowance -> pull -> read allowance again.

import fs from "fs";
import {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createKeyPairSignerFromBytes,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  sendAndConfirmTransactionFactory,
  getSignatureFromTransaction,
  address,
} from "@solana/kit";
import {
  getInitSubscriptionAuthorityInstructionAsync,
  getCreateRecurringDelegationInstruction,
  getTransferRecurringInstructionAsync,
  findSubscriptionAuthorityPda,
  findRecurringDelegationPda,
  fetchRecurringDelegation,
  fetchMaybeSubscriptionAuthority,
} from "@solana/subscriptions";

const RPC_URL = "https://api.devnet.solana.com";
const RPC_WS_URL = "wss://api.devnet.solana.com";
const TOKEN_PROGRAM = address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const MINT = address("Hm48r4majxKMNzBBDP13KnUcW6C612sPTTd9MuKfTFi2");

function loadSigner(path) {
  const raw = JSON.parse(fs.readFileSync(path, "utf8"));
  return createKeyPairSignerFromBytes(Uint8Array.from(raw));
}

async function sendIx(rpc, rpcSubscriptions, payer, signers, instructions, label) {
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  let message = createTransactionMessage({ version: 0 });
  message = setTransactionMessageFeePayerSigner(payer, message);
  message = setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, message);
  message = appendTransactionMessageInstructions(instructions, message);
  const signed = await signTransactionMessageWithSigners(message);
  const sendAndConfirm = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions });
  await sendAndConfirm(signed, { commitment: "confirmed" });
  const sig = getSignatureFromTransaction(signed);
  console.log(`[${label}] signature: ${sig}`);
  return sig;
}

async function main() {
  const rpc = createSolanaRpc(RPC_URL);
  const rpcSubscriptions = createSolanaRpcSubscriptions(RPC_WS_URL);

  const merchantPayer = await loadSigner("/mnt/c/Users/Inteli/Downloads/claim_chain/keys/merchant-devnet.json");
  const delegator = await loadSigner("/mnt/c/Users/Inteli/Downloads/claim_chain/keys/client-devnet.json"); // the paying client
  const delegatee = await loadSigner("/mnt/c/Users/Inteli/Downloads/claim_chain/keys/agent-puller-devnet.json"); // the merchant's agent key

  console.log("delegator (client):", delegator.address);
  console.log("delegatee (agent-puller):", delegatee.address);
  console.log("payer (merchant, funds rent/fees only):", merchantPayer.address);

  // The client's own USDC-test ATA already exists from earlier Layer 0 testing.
  const clientAta = address("5iExBaHNXtrnumSMUUojKNFdwaWhAW9pE14KbTPbzrfv");

  // --- 1. init_subscription_authority ---
  const [subscriptionAuthorityPda] = await findSubscriptionAuthorityPda({
    user: delegator.address,
    tokenMint: MINT,
  });
  console.log("subscriptionAuthorityPda:", subscriptionAuthorityPda);

  const existingSA = await fetchMaybeSubscriptionAuthority(rpc, subscriptionAuthorityPda);
  let currentInitId;
  if (existingSA.exists) {
    console.log("subscription authority already exists, skipping init. initId =", existingSA.data.initId.toString());
    currentInitId = BigInt(existingSA.data.initId);
  } else {
    const initIx = await getInitSubscriptionAuthorityInstructionAsync({
      owner: delegator,
      tokenMint: MINT,
      userAta: clientAta,
      tokenProgram: TOKEN_PROGRAM,
      payer: merchantPayer,
    });
    await sendIx(rpc, rpcSubscriptions, merchantPayer, [delegator, merchantPayer], [initIx], "init_subscription_authority");
    const freshSA = await fetchMaybeSubscriptionAuthority(rpc, subscriptionAuthorityPda);
    currentInitId = BigInt(freshSA.data.initId);
  }
  console.log("using expectedSubscriptionAuthorityInitId =", currentInitId.toString());

  // --- 2. create_recurring_delegation: cap 5 USDC-test / 60s period, expires in 1 day ---
  const nonce = BigInt(Date.now()); // unique per test run so re-runs don't collide
  const amountPerPeriod = 5_000_000n; // 5 tokens at 6 decimals
  const periodLengthS = 60n;
  const nowSlotTime = BigInt(Math.floor(Date.now() / 1000));
  const startTs = nowSlotTime;
  const expiryTs = nowSlotTime + 86_400n;

  const [delegationPda] = await findRecurringDelegationPda({
    subscriptionAuthority: subscriptionAuthorityPda,
    delegator: delegator.address,
    delegatee: delegatee.address,
    nonce,
  });
  console.log("delegationPda:", delegationPda);

  const createIx = getCreateRecurringDelegationInstruction({
    delegator,
    subscriptionAuthority: subscriptionAuthorityPda,
    delegationAccount: delegationPda,
    delegatee: delegatee.address,
    payer: merchantPayer,
    recurringDelegation: {
      nonce,
      amountPerPeriod,
      periodLengthS,
      startTs,
      expiryTs,
      expectedSubscriptionAuthorityInitId: currentInitId,
    },
  });
  await sendIx(rpc, rpcSubscriptions, merchantPayer, [delegator, merchantPayer], [createIx], "create_recurring_delegation");

  // --- 3. read allowance before any pull ---
  let delegation = await fetchRecurringDelegation(rpc, delegationPda);
  console.log("After create — amountPerPeriod:", delegation.data.amountPerPeriod.toString(),
    "amountPulledInPeriod:", delegation.data.amountPulledInPeriod.toString(),
    "remaining:", (delegation.data.amountPerPeriod - delegation.data.amountPulledInPeriod).toString());

  // --- 4. transfer_recurring: pull 1 USDC-test, well within the 5-token cap ---
  const merchantAta = address("GPXAZqLiyr8Wzs24JUxZ76tJsvaZFhinFNRSVqoNSbNU"); // merchant's own ATA, receiving the pull
  const pullAmount = 1_000_000n; // 1 token

  const transferIx = await getTransferRecurringInstructionAsync({
    delegationPda,
    subscriptionAuthority: subscriptionAuthorityPda,
    delegatorAta: clientAta,
    receiverAta: merchantAta,
    tokenMint: MINT,
    tokenProgram: TOKEN_PROGRAM,
    delegatee,
    transferData: {
      amount: pullAmount,
      delegator: delegator.address,
      mint: MINT,
    },
  });
  await sendIx(rpc, rpcSubscriptions, merchantPayer, [delegatee, merchantPayer], [transferIx], "transfer_recurring");

  // --- 5. read allowance after the pull ---
  delegation = await fetchRecurringDelegation(rpc, delegationPda);
  console.log("After pull — amountPerPeriod:", delegation.data.amountPerPeriod.toString(),
    "amountPulledInPeriod:", delegation.data.amountPulledInPeriod.toString(),
    "remaining:", (delegation.data.amountPerPeriod - delegation.data.amountPulledInPeriod).toString());

  console.log("\n✅ Isolated recurring-delegation lifecycle test complete.");
}

main().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
