// Simulates what a real wallet does when a client opens the
// authorize-subscription Blink: fetch the unsigned transaction from our
// Action endpoint, sign it with the CLIENT's own key (never seen by our
// server or agent), submit it. This is the client-facing UX gap Layer 1
// was missing - proven here with a genuinely independent, freshly
// generated keypair, not the team's reused test client.

import fs from "fs";
import {
  createSolanaRpc, createSolanaRpcSubscriptions, createKeyPairSignerFromBytes,
  getTransactionDecoder, getBase64Encoder, signTransaction,
  getBase64EncodedWireTransaction, sendAndConfirmTransactionFactory,
  getSignatureFromTransaction, address,
} from "@solana/kit";
import { getInitSubscriptionAuthorityInstructionAsync, findSubscriptionAuthorityPda, fetchMaybeSubscriptionAuthority, fetchRecurringDelegation, findRecurringDelegationPda } from "@solana/subscriptions";
import { createTransactionMessage, setTransactionMessageFeePayerSigner, setTransactionMessageLifetimeUsingBlockhash, appendTransactionMessageInstructions, signTransactionMessageWithSigners } from "@solana/kit";

const RPC_URL = "https://api.devnet.solana.com";
const MINT = address("Hm48r4majxKMNzBBDP13KnUcW6C612sPTTd9MuKfTFi2");
const TOKEN_PROGRAM = address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ACTIONS_BASE = "http://localhost:8787";

function loadSigner(path) {
  return createKeyPairSignerFromBytes(Uint8Array.from(JSON.parse(fs.readFileSync(path, "utf8"))));
}

async function main() {
  const rpc = createSolanaRpc(RPC_URL);
  const rpcSubscriptions = createSolanaRpcSubscriptions("wss://api.devnet.solana.com");
  const client = await loadSigner("/mnt/c/Users/Inteli/Downloads/claim_chain/keys/fresh-client-devnet.json");
  console.log("fresh client address:", client.address);

  // Prerequisite the Action endpoint does not yet cover: init subscription authority.
  const [subscriptionAuthorityPda] = await findSubscriptionAuthorityPda({ user: client.address, tokenMint: MINT });
  const existing = await fetchMaybeSubscriptionAuthority(rpc, subscriptionAuthorityPda);
  if (!existing.exists) {
    const [clientAta] = await import("@solana-program/token").then(m => m.findAssociatedTokenPda({ owner: client.address, mint: MINT, tokenProgram: TOKEN_PROGRAM }));
    const initIx = await getInitSubscriptionAuthorityInstructionAsync({ owner: client, tokenMint: MINT, userAta: clientAta, tokenProgram: TOKEN_PROGRAM });
    const { value: bh } = await rpc.getLatestBlockhash().send();
    let msg = createTransactionMessage({ version: 0 });
    msg = setTransactionMessageFeePayerSigner(client, msg);
    msg = setTransactionMessageLifetimeUsingBlockhash(bh, msg);
    msg = appendTransactionMessageInstructions([initIx], msg);
    const signed = await signTransactionMessageWithSigners(msg);
    await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(signed, { commitment: "confirmed" });
    console.log("init_subscription_authority done:", getSignatureFromTransaction(signed));
  } else {
    console.log("subscription authority already exists for this client");
  }

  // --- This is the actual Blink flow: GET metadata, POST for the tx ---
  const meta = await fetch(`${ACTIONS_BASE}/actions/authorize-subscription`).then((r) => r.json());
  console.log("Action metadata:", meta.title, "-", meta.label);

  const postResp = await fetch(`${ACTIONS_BASE}/actions/authorize-subscription?amount=15000000&period_s=60`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account: client.address }),
  }).then((r) => r.json());

  if (postResp.error) throw new Error(`Action server error: ${postResp.error}`);
  console.log("Received unsigned transaction from Action endpoint.", postResp.message);

  // Decode the base64 wire transaction the server built (unsigned - client's
  // signature slot is empty) and have the CLIENT's own key sign it, exactly
  // like a wallet app would after the user taps "Approve".
  const wireBytes = getBase64Encoder().encode(postResp.transaction);
  const decoded = getTransactionDecoder().decode(wireBytes);
  const signed = await signTransaction([client.keyPair], decoded);
  const signature = getSignatureFromTransaction(signed);

  // Plain send + poll, matching what a wallet does after decoding a Blink
  // transaction it did not itself construct (no local lastValidBlockHeight
  // bookkeeping available for that convenience path).
  await rpc.sendTransaction(getBase64EncodedWireTransaction(signed), { encoding: "base64", skipPreflight: false }).send();
  let confirmed = false;
  for (let i = 0; i < 20 && !confirmed; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const statuses = await rpc.getSignatureStatuses([signature]).send();
    const st = statuses.value[0];
    if (st && (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized")) {
      if (st.err) throw new Error(`Transaction failed on-chain: ${JSON.stringify(st.err)}`);
      confirmed = true;
    }
  }
  if (!confirmed) throw new Error("Transaction did not confirm in time");
  console.log("✅ Client-signed transaction landed on-chain. Signature:", signature);

  // Verify the delegation actually exists now, independently.
  // (We don't know the nonce the server used - fetch by scanning recent
  // memcmp is more than this quick check needs; instead confirm via the
  // transaction's own logs/meta that it succeeded, which sendAndConfirm
  // already guarantees by throwing on failure.)
  console.log("\nProof: this transaction was built by our server, but signed and paid for entirely by an independently generated keypair our server/agent never held the private key of.");
}

main().catch((e) => { console.error("FAILED:", e); process.exit(1); });
