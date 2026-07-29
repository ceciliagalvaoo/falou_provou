// Executes ONE transfer_recurring pull against an existing recurring
// delegation. This is the only script in the product that signs with the
// agent-puller keypair - the key this SOP's custody paragraph describes.
// The program itself enforces the per-period cap; this script does not
// decide the amount is "safe", it only proposes it and lets the program
// accept or reject.
//
// Prints one JSON object: {"success","signature","reason"}. A rejected
// pull (e.g. AMOUNT_EXCEEDS_PERIOD_LIMIT) is reported as success:false with
// the program's own reason - never treated as a script bug.
//
// The keypair path is hardcoded below, NOT a CLI argument, and the key file
// lives in `keys/` - outside risk_profiles.core.allowed_roots (the agent's
// shell/file_read reach is scoped to zeroclaw-data/shared only). This is a
// real, technical fix for a real finding (2026-07-28): with the key
// previously placed inside allowed_roots so this script could reference it
// by path, a prompt-injection test showed the agent would `cat` the raw key
// file and paste its contents into a chat reply on request, given a
// plausible pretext ("preciso migrar a chave pra outro servidor"). Moving
// the file out of the agent's reach and removing the path from the visible
// command line means the agent can no longer read the key through any tool
// it has, regardless of what it is told - this is a structural fix, not an
// instruction telling it not to.

import fs from "fs";
import {
  createSolanaRpc, createSolanaRpcSubscriptions, createKeyPairSignerFromBytes,
  createTransactionMessage, setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash, appendTransactionMessageInstructions,
  signTransactionMessageWithSigners, sendAndConfirmTransactionFactory,
  getSignatureFromTransaction, address,
} from "@solana/kit";
import { getTransferRecurringInstructionAsync, findSubscriptionAuthorityPda } from "@solana/subscriptions";

const DELEGATEE_KEYPAIR_PATH = "/mnt/c/Users/Inteli/Downloads/claim_chain/keys/agent-puller-devnet.json";

function arg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || !process.argv[idx + 1]) throw new Error(`missing --${name}`);
  return process.argv[idx + 1];
}

function loadSigner(path) {
  return createKeyPairSignerFromBytes(Uint8Array.from(JSON.parse(fs.readFileSync(path, "utf8"))));
}

async function main() {
  const rpcUrl = arg("rpc-url");
  const rpcWsUrl = rpcUrl.replace("https://", "wss://").replace("http://", "ws://");
  const delegationPda = address(arg("delegation-pda"));
  const delegatorAddr = address(arg("delegator"));
  const delegatorAta = address(arg("delegator-ata"));
  const receiverAta = address(arg("receiver-ata"));
  const mint = address(arg("mint"));
  const tokenProgram = address(arg("token-program"));
  const amount = BigInt(arg("amount"));

  const rpc = createSolanaRpc(rpcUrl);
  const rpcSubscriptions = createSolanaRpcSubscriptions(rpcWsUrl);
  const delegatee = await loadSigner(DELEGATEE_KEYPAIR_PATH);
  // The agent-puller key pays its own transaction fees. It deliberately
  // never touches the merchant's main treasury key (which stays outside
  // this agent's filesystem allowlist entirely) - a tiny SOL gas balance
  // is funded onto this key once, out of band, by the human operator.
  const payer = delegatee;

  const [subscriptionAuthorityPda] = await findSubscriptionAuthorityPda({ user: delegatorAddr, tokenMint: mint });

  try {
    const ix = await getTransferRecurringInstructionAsync({
      delegationPda,
      subscriptionAuthority: subscriptionAuthorityPda,
      delegatorAta,
      receiverAta,
      tokenMint: mint,
      tokenProgram,
      delegatee,
      transferData: { amount, delegator: delegatorAddr, mint },
    });

    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
    let message = createTransactionMessage({ version: 0 });
    message = setTransactionMessageFeePayerSigner(payer, message);
    message = setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, message);
    message = appendTransactionMessageInstructions([ix], message);
    const signed = await signTransactionMessageWithSigners(message);
    await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(signed, { commitment: "confirmed" });
    const signature = getSignatureFromTransaction(signed);

    console.log(JSON.stringify({ success: true, signature, reason: null }));
  } catch (err) {
    const programMessage = err?.cause?.message || err?.message || String(err);
    console.log(JSON.stringify({ success: false, signature: null, reason: programMessage }));
  }
}

main();
