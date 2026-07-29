import fs from "fs";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

const [,, referenceArg, amountArg] = process.argv;
if (!referenceArg || !amountArg) {
  console.error("usage: node pay.mjs <reference_pubkey_base58> <amount_ui>");
  process.exit(1);
}

const RPC_URL = "https://api.devnet.solana.com";
const MINT = new PublicKey("Hm48r4majxKMNzBBDP13KnUcW6C612sPTTd9MuKfTFi2");
const DECIMALS = 6;

function loadKeypair(path) {
  const raw = JSON.parse(fs.readFileSync(path, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

const client = loadKeypair("/mnt/c/Users/Inteli/Downloads/claim_chain/keys/client-devnet.json");
const merchant = loadKeypair("/mnt/c/Users/Inteli/Downloads/claim_chain/keys/merchant-devnet.json");
const reference = new PublicKey(referenceArg);
const amount = BigInt(Math.round(parseFloat(amountArg) * 10 ** DECIMALS));

const connection = new Connection(RPC_URL, "confirmed");

const clientAta = getAssociatedTokenAddressSync(MINT, client.publicKey);
const merchantAta = getAssociatedTokenAddressSync(MINT, merchant.publicKey);

const ix = createTransferCheckedInstruction(
  clientAta,
  MINT,
  merchantAta,
  client.publicKey,
  amount,
  DECIMALS
);
// Solana Pay convention: append the reference key as an extra read-only,
// non-signer account on the transfer instruction so the payment can later
// be found via getSignaturesForAddress(reference).
ix.keys.push({ pubkey: reference, isSigner: false, isWritable: false });

const tx = new Transaction().add(ix);
tx.feePayer = merchant.publicKey;
const { blockhash } = await connection.getLatestBlockhash();
tx.recentBlockhash = blockhash;
tx.sign(client, merchant);

const sig = await sendAndConfirmTransaction(connection, tx, [client, merchant]);
console.log(JSON.stringify({ signature: sig, reference: referenceArg, amount: amountArg }));
