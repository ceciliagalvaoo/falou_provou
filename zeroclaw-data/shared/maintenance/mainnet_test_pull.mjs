// One-off, throwaway script for the real mainnet Layer 1 validation test
// (2026-07-29) - executes ONE transfer_recurring pull against the real
// delegation the client authorized via mainnet-test-page.html. Same shape
// as subscription-pull's own execute_pull.mjs, hardcoded to this specific
// test's real addresses so it doesn't need to touch the devnet script.
import fs from "fs";
import {
  createSolanaRpc, createSolanaRpcSubscriptions, createKeyPairSignerFromBytes,
  createTransactionMessage, setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash, appendTransactionMessageInstructions,
  signTransactionMessageWithSigners, sendAndConfirmTransactionFactory,
  getSignatureFromTransaction, address,
} from "@solana/kit";
import { getTransferRecurringInstructionAsync } from "@solana/subscriptions";
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";

const RPC_URL = "https://api.mainnet-beta.solana.com";
const MINT = address("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const TOKEN_PROGRAM = TOKEN_PROGRAM_ADDRESS;
const DELEGATION_PDA = address("G1QEEsdxWEQAwu8hSYdm2MKvKDgRzpDrjkVXpNFSwrHn");
const DELEGATOR = address("HTrLsm862Y3YKfBASVZK5vHXeQkQ5Difp2szKG7ziRrk");
const MERCHANT = address("ADmd4LkUar6BpUZxAR24jL19QHKPZFqDiVPXqP1j1GzQ");
const AMOUNT = 400n; // full cap for this period, 0.0004 USDC

function loadSigner(path) {
  return createKeyPairSignerFromBytes(Uint8Array.from(JSON.parse(fs.readFileSync(path, "utf8"))));
}

async function main() {
  const rpc = createSolanaRpc(RPC_URL);
  const rpcSubscriptions = createSolanaRpcSubscriptions("wss://api.mainnet-beta.solana.com");
  const delegatee = await loadSigner("/mnt/c/Users/Inteli/Downloads/claim_chain/keys/mainnet/agent-puller-mainnet.json");

  const [delegatorAta] = await findAssociatedTokenPda({ owner: DELEGATOR, mint: MINT, tokenProgram: TOKEN_PROGRAM });
  const [receiverAta] = await findAssociatedTokenPda({ owner: MERCHANT, mint: MINT, tokenProgram: TOKEN_PROGRAM });
  console.log("delegator ATA:", delegatorAta, "| receiver ATA:", receiverAta);

  const ix = await getTransferRecurringInstructionAsync({
    delegationPda: DELEGATION_PDA,
    subscriptionAuthority: address("3awM7hJzohdzZ3daaBwcrpyVySD1aFdtmvzR5mZh7XC9"),
    delegatorAta, receiverAta,
    tokenMint: MINT, tokenProgram: TOKEN_PROGRAM,
    delegatee,
    transferData: { amount: AMOUNT, delegator: DELEGATOR, mint: MINT },
  });

  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  let message = createTransactionMessage({ version: 0 });
  message = setTransactionMessageFeePayerSigner(delegatee, message);
  message = setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, message);
  message = appendTransactionMessageInstructions([ix], message);
  const signed = await signTransactionMessageWithSigners(message);

  try {
    await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(signed, { commitment: "confirmed" });
    const signature = getSignatureFromTransaction(signed);
    console.log(JSON.stringify({ success: true, signature }));
  } catch (err) {
    console.log(JSON.stringify({ success: false, reason: err?.cause?.message || err.message }));
  }
}

main();
