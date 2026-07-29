import fs from "fs";
import {
  createSolanaRpc, createKeyPairSignerFromBytes, getTransactionDecoder,
  getBase64Encoder, signTransaction, getSignatureFromTransaction,
  getBase64EncodedWireTransaction,
} from "@solana/kit";

const ACTIONS_BASE = "http://localhost:8787";

function loadSigner(path) {
  return createKeyPairSignerFromBytes(Uint8Array.from(JSON.parse(fs.readFileSync(path, "utf8"))));
}

async function main() {
  const rpc = createSolanaRpc("https://api.devnet.solana.com");
  const owner = await loadSigner("/mnt/c/Users/Inteli/Downloads/claim_chain/keys/merchant-devnet.json");

  const postResp = await fetch(`${ACTIONS_BASE}/actions/pay-supplier?supplier=fornecedor-teste&amount=2000000`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account: owner.address }),
  }).then((r) => r.json());

  if (postResp.error) throw new Error(`Action server error: ${postResp.error}`);
  console.log("Received unsigned supplier-payment transaction.");

  const wireBytes = getBase64Encoder().encode(postResp.transaction);
  const decoded = getTransactionDecoder().decode(wireBytes);
  const signed = await signTransaction([owner.keyPair], decoded);
  const signature = getSignatureFromTransaction(signed);

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
  if (!confirmed) throw new Error("did not confirm in time");
  console.log("✅ Supplier payment landed on-chain (owner's own wallet signed, agent never touched a key). Signature:", signature);
}

main().catch((e) => { console.error("FAILED:", e); process.exit(1); });
