// Minimal Solana Actions (Blinks) HTTP server for Claim & Chain / Falou e
// Provou, Layer 1. Implements the two Action endpoints Layer 1 needs:
//
//   /actions/authorize-subscription  - a client authorizes the merchant's
//     agent-puller key once, from their OWN wallet. The agent never signs
//     this; it only proposes the unsigned transaction.
//
//   /actions/pay-supplier - the OWNER (merchant) pays a known supplier.
//     The agent never signs this either. An unrecognized destination
//     address is refused server-side before any transaction is built -
//     the allowlist checkpoint happens here, not just in the UI.
//
// Spec reference (verified against solana.com/docs/advanced/actions,
// 2026-07-28): GET returns {type,icon,title,description,label,...}; POST
// returns {transaction: <base64>, message?}; OPTIONS must answer with
// Access-Control-Allow-{Origin,Methods,Headers}.
//
// Devnet + localhost only today. Real hosting (public domain, TLS) is a
// deployment step, not a code gap - see evidence/ for the explicit
// scope note.

import http from "http";
import fs from "fs";
import { URL } from "url";
import {
  createSolanaRpc, address, createTransactionMessage,
  setTransactionMessageFeePayer, setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions, compileTransaction,
  getBase64EncodedWireTransaction, createNoopSigner,
} from "@solana/kit";
import {
  getCreateRecurringDelegationInstruction, findSubscriptionAuthorityPda,
  findRecurringDelegationPda, fetchMaybeSubscriptionAuthority,
  getInitSubscriptionAuthorityInstructionAsync,
} from "@solana/subscriptions";
import { getTransferCheckedInstruction, findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS, getCreateAssociatedTokenIdempotentInstructionAsync } from "@solana-program/token";

// Network selection via env vars, devnet remains the default so existing
// invocations (and evidence/*.md's own citations of this file's behavior)
// are unaffected. Mainnet run, 2026-07-29: real merchant/agent-puller keys,
// real Circle USDC mint - verified independently before use, see
// evidence/reproducibility-2026-07-29-mainnet.md.
const PORT = process.argv[2] ? Number(process.argv[2]) : 8787;
const RPC_URL = process.env.CLAIM_CHAIN_RPC_URL || "https://api.devnet.solana.com";
const MINT = address(process.env.CLAIM_CHAIN_MINT || "Hm48r4majxKMNzBBDP13KnUcW6C612sPTTd9MuKfTFi2");
const MINT_DECIMALS = 6;
const AGENT_PULLER = address(process.env.CLAIM_CHAIN_AGENT_PULLER || "HepTxTom6v8pkFAfa5j4FYS3UG2GbQhQoTRTgttaUnGF");
const rpc = createSolanaRpc(RPC_URL);

const SUPPLIERS_PATH = "/mnt/c/Users/Inteli/Downloads/claim_chain/zeroclaw-data/shared/known-suppliers.json";
function loadSuppliers() {
  return JSON.parse(fs.readFileSync(SUPPLIERS_PATH, "utf8"));
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Content-Encoding, Accept-Encoding",
};

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", ...CORS_HEADERS });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

async function buildAuthorizeSubscriptionTx(clientAccount, params) {
  const [subscriptionAuthorityPda] = await findSubscriptionAuthorityPda({ user: clientAccount, tokenMint: MINT });
  const existingSA = await fetchMaybeSubscriptionAuthority(rpc, subscriptionAuthorityPda);

  if (existingSA.exists) {
    return buildAuthorizeSubscriptionFinishTx(clientAccount, params, existingSA);
  }

  // First-time client: init_subscription_authority (+ create their ATA,
  // which it reads and which won't exist yet either) has to land on its
  // own, in its own transaction, before create_recurring_delegation can
  // be built - see buildAuthorizeSubscriptionFinishTx's comment for why
  // this genuinely cannot be one transaction. Returns a Solana Actions
  // "next" link so the wallet automatically chains straight into the
  // second (also unsigned, also client-verifiable) transaction once this
  // one confirms - two taps, not two separate conversations.
  const delegatorSigner = createNoopSigner(clientAccount);
  const [clientAta] = await findAssociatedTokenPda({ owner: clientAccount, mint: MINT, tokenProgram: TOKEN_PROGRAM_ADDRESS });
  const createAtaIx = await getCreateAssociatedTokenIdempotentInstructionAsync({
    payer: delegatorSigner, owner: clientAccount, mint: MINT,
  });
  const initIx = await getInitSubscriptionAuthorityInstructionAsync({
    owner: delegatorSigner, tokenMint: MINT, userAta: clientAta, tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });

  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  let message = createTransactionMessage({ version: 0 });
  message = setTransactionMessageFeePayer(clientAccount, message);
  message = setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, message);
  message = appendTransactionMessageInstructions([createAtaIx, initIx], message);
  const compiled = compileTransaction(message);
  return { transactionBase64: getBase64EncodedWireTransaction(compiled), needsInit: true };
}

async function buildAuthorizeSubscriptionFinishTx(clientAccount, params, existingSA) {
  const delegatorSigner = createNoopSigner(clientAccount); // client signs later, in their own wallet
  const amountPerPeriod = BigInt(params.get("amount") || "20000000"); // default 20 test-USDC
  const periodLengthS = BigInt(params.get("period_s") || "2592000"); // default 30 days
  const nonce = BigInt(Date.now());
  const now = BigInt(Math.floor(Date.now() / 1000));
  const expiryTs = now + BigInt(params.get("expiry_s") || "31536000"); // default 1 year

  const [subscriptionAuthorityPda] = await findSubscriptionAuthorityPda({ user: clientAccount, tokenMint: MINT });
  if (!existingSA) existingSA = await fetchMaybeSubscriptionAuthority(rpc, subscriptionAuthorityPda);
  if (!existingSA.exists) {
    throw new Error("subscription authority still doesn't exist on-chain - the init transaction may not have landed/confirmed yet, try again in a few seconds");
  }
  // The program assigns initId (used below as an optimistic-concurrency
  // check) at the exact slot init_subscription_authority lands in - a
  // client cannot predict this value before that transaction confirms, so
  // it must be read fresh here, never guessed or cached from before the
  // init step (confirmed empirically: guessing 0 for a same-tx-batched
  // attempt failed with the program's own STALE_SUBSCRIPTION_AUTHORITY
  // error, code 136).
  const initId = BigInt(existingSA.data.initId);

  const [delegationPda] = await findRecurringDelegationPda({
    subscriptionAuthority: subscriptionAuthorityPda,
    delegator: clientAccount,
    delegatee: AGENT_PULLER,
    nonce,
  });

  const ix = getCreateRecurringDelegationInstruction({
    delegator: delegatorSigner,
    subscriptionAuthority: subscriptionAuthorityPda,
    delegationAccount: delegationPda,
    delegatee: AGENT_PULLER,
    // payer omitted -> defaults to the delegator/signer, so the client pays
    // their own rent and this stays a single-signer transaction.
    recurringDelegation: { nonce, amountPerPeriod, periodLengthS, startTs: now, expiryTs, expectedSubscriptionAuthorityInitId: initId },
  });

  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  let message = createTransactionMessage({ version: 0 });
  message = setTransactionMessageFeePayer(clientAccount, message);
  message = setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, message);
  message = appendTransactionMessageInstructions([ix], message);
  const compiled = compileTransaction(message);
  return { transactionBase64: getBase64EncodedWireTransaction(compiled), delegationPda };
}

async function buildPaySupplierTx(ownerAccount, params) {
  const supplierKey = params.get("supplier");
  const suppliers = loadSuppliers();
  const supplier = suppliers.find((s) => s.key === supplierKey);
  if (!supplier) {
    return { error: `Unknown supplier "${supplierKey}" - not on the allowlist. Refusing to build a transaction.` };
  }
  const amount = BigInt(params.get("amount") || "0");
  if (amount <= 0n) return { error: "amount must be a positive integer (base units)." };

  const ownerSigner = createNoopSigner(ownerAccount);
  const supplierAddress = address(supplier.address);

  const [ownerAta] = await findAssociatedTokenPda({ owner: ownerAccount, mint: MINT, tokenProgram: TOKEN_PROGRAM_ADDRESS });
  const [supplierAta] = await findAssociatedTokenPda({ owner: supplierAddress, mint: MINT, tokenProgram: TOKEN_PROGRAM_ADDRESS });

  const ix = getTransferCheckedInstruction({
    source: ownerAta,
    mint: MINT,
    destination: supplierAta,
    authority: ownerSigner,
    amount,
    decimals: MINT_DECIMALS,
  });

  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  let message = createTransactionMessage({ version: 0 });
  message = setTransactionMessageFeePayer(ownerAccount, message);
  message = setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, message);
  message = appendTransactionMessageInstructions([ix], message);
  const compiled = compileTransaction(message);
  // Durable-nonce trap (explicitly named in the bounty text): a regular
  // blockhash expires ~90s after fetch. A Blink is expected to be opened
  // and signed within seconds by a human wallet, so we accept that window
  // for this MVP rather than adding a durable nonce account - documented
  // choice, not an oversight. If the checkpoint/approval step in the owning
  // SOP can plausibly stretch past ~60s, re-issue a fresh transaction
  // (fresh blockhash) rather than reusing this one.
  return { transactionBase64: getBase64EncodedWireTransaction(compiled) };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  if (url.pathname === "/actions.json" && req.method === "GET") {
    sendJson(res, 200, {
      rules: [
        { pathPattern: "/actions/authorize-subscription", apiPath: "/actions/authorize-subscription" },
        { pathPattern: "/actions/pay-supplier", apiPath: "/actions/pay-supplier" },
      ],
    });
    return;
  }

  if (url.pathname === "/actions/authorize-subscription" && req.method === "GET") {
    sendJson(res, 200, {
      type: "action",
      icon: "https://example.invalid/provou-icon.png",
      title: "Falou e Provou — assinatura recorrente",
      description: "Autorize o comerciante a cobrar um valor fixo por período, com teto imposto pelo próprio programa Solana. Você pode revogar quando quiser.",
      label: "Autorizar assinatura",
    });
    return;
  }

  if (url.pathname === "/actions/authorize-subscription" && req.method === "POST") {
    const body = await readBody(req);
    if (!body.account) return sendJson(res, 400, { error: "missing 'account' (the connecting wallet's address)" });
    try {
      const result = await buildAuthorizeSubscriptionTx(address(body.account), url.searchParams);
      if (result.needsInit) {
        sendJson(res, 200, {
          type: "transaction",
          transaction: result.transactionBase64,
          message: "Primeira vez com este token: esta transação cria sua autorização. Depois de confirmada, um segundo passo (automático) cria a assinatura recorrente propriamente dita.",
          links: { next: { type: "post", href: `/actions/authorize-subscription/finish${url.search}` } },
        });
      } else {
        sendJson(res, 200, {
          transaction: result.transactionBase64,
          message: `Autorização criada. Delegation PDA: ${result.delegationPda}`,
        });
      }
    } catch (err) {
      sendJson(res, 500, { error: String(err?.message || err) });
    }
    return;
  }

  // Solana Actions "next" link target: the wallet POSTs here automatically
  // once the init transaction above lands, with {account, signature} (the
  // signature isn't independently re-verified here beyond that - this
  // endpoint's own job is just to read the now-real on-chain state and
  // propose the follow-up unsigned transaction, never to sign or move
  // anything itself, same as every other endpoint in this file).
  if (url.pathname === "/actions/authorize-subscription/finish" && req.method === "POST") {
    const body = await readBody(req);
    if (!body.account) return sendJson(res, 400, { error: "missing 'account' (the connecting wallet's address)" });
    try {
      const { transactionBase64, delegationPda } = await buildAuthorizeSubscriptionFinishTx(address(body.account), url.searchParams, null);
      sendJson(res, 200, {
        type: "transaction",
        transaction: transactionBase64,
        message: `Autorização criada. Delegation PDA: ${delegationPda}`,
      });
    } catch (err) {
      sendJson(res, 500, { error: String(err?.message || err) });
    }
    return;
  }

  if (url.pathname === "/actions/pay-supplier" && req.method === "GET") {
    sendJson(res, 200, {
      type: "action",
      icon: "https://example.invalid/provou-icon.png",
      title: "Falou e Provou — pagar fornecedor",
      description: "Paga um fornecedor conhecido em USDC. Endereços fora da lista permitida são recusados antes mesmo de gerar a transação.",
      label: "Pagar fornecedor",
    });
    return;
  }

  if (url.pathname === "/actions/pay-supplier" && req.method === "POST") {
    const body = await readBody(req);
    if (!body.account) return sendJson(res, 400, { error: "missing 'account' (the connecting wallet's address)" });
    try {
      const result = await buildPaySupplierTx(address(body.account), url.searchParams);
      if (result.error) return sendJson(res, 400, { error: result.error });
      sendJson(res, 200, { transaction: result.transactionBase64 });
    } catch (err) {
      sendJson(res, 500, { error: String(err?.message || err) });
    }
    return;
  }

  sendJson(res, 404, { error: "not found" });
});

server.listen(PORT, () => console.log(`Actions server listening on http://localhost:${PORT}`));
