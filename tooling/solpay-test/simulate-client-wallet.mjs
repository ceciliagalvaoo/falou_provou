// Simulates a real wallet driving the Solana Actions two-step
// authorize-subscription flow against the live tooling/actions-server,
// exactly as a browser wallet (Phantom, Backpack) would when a client
// opens the bot's generated link. Uses keys/client-devnet.json as the
// "client" (Maria) signer. Uses @solana/web3.js's VersionedTransaction,
// the same deserialize/sign pattern already proven working against this
// same server on mainnet earlier this session
// (tooling/actions-server/mainnet-test-page.html).
import fs from "fs";
import { Connection, Keypair, VersionedTransaction } from "@solana/web3.js";

const RPC_URL = "https://api.devnet.solana.com";
const SERVER = "http://localhost:8787";

const [,, queryString] = process.argv;
if (!queryString) {
  console.error("usage: node simulate-client-wallet.mjs '<query string, e.g. amount=1000000&period_s=2592000&expiry_s=31536000>'");
  process.exit(1);
}

function loadKeypair(path) {
  const raw = JSON.parse(fs.readFileSync(path, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

async function signAndSend(connection, keypair, base64Tx, label) {
  const tx = VersionedTransaction.deserialize(Buffer.from(base64Tx, "base64"));
  tx.sign([keypair]);
  const sig = await connection.sendTransaction(tx, { skipPreflight: false });
  await connection.confirmTransaction(sig, "confirmed");
  console.log(`[${label}] signature: ${sig}`);
  return sig;
}

async function main() {
  const connection = new Connection(RPC_URL, "confirmed");
  const client = loadKeypair("/mnt/c/Users/Inteli/Downloads/claim_chain/keys/client-devnet.json");
  console.log("client (Maria) address:", client.publicKey.toBase58());

  const step1 = await fetch(`${SERVER}/actions/authorize-subscription?${queryString}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account: client.publicKey.toBase58() }),
  }).then((r) => r.json());

  if (step1.error) throw new Error(`step1 error: ${step1.error}`);
  console.log("step1 message:", step1.message);
  await signAndSend(connection, client, step1.transaction, "step1");

  if (step1.links?.next) {
    // First-time client: a genuine second step, built only after step 1
    // landed on-chain (the real init-then-finish flow).
    await new Promise((r) => setTimeout(r, 3000));
    const finishUrl = `${SERVER}${step1.links.next.href}`;
    const step2 = await fetch(finishUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account: client.publicKey.toBase58() }),
    }).then((r) => r.json());
    if (step2.error) throw new Error(`step2 error: ${step2.error}`);
    console.log("step2 message:", step2.message);
    await signAndSend(connection, client, step2.transaction, "step2");
  }

  console.log("Authorization complete.");
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
