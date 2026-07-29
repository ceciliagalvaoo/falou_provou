#!/usr/bin/env node
// Resolves a supplier key against the shared allowlist and exits non-zero
// with {"found":false} if it is not present. This is the actual technical
// gate on known-suppliers.json for this SOP - the agent never decides
// on its own reading of the file, it only reads this script's verdict.
// Same allowlist file the Actions server (tooling/actions-server/server.mjs)
// uses, so there is one canonical source of truth for both paths.
import fs from "fs";

const SUPPLIERS_PATH = "/mnt/c/Users/Inteli/Downloads/claim_chain/zeroclaw-data/shared/known-suppliers.json";

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

const supplierKey = arg("--supplier-key");
if (!supplierKey) {
  console.log(JSON.stringify({ found: false, error: "missing --supplier-key" }));
  process.exit(1);
}

const suppliers = JSON.parse(fs.readFileSync(SUPPLIERS_PATH, "utf8"));
const supplier = suppliers.find((s) => s.key === supplierKey);

if (!supplier) {
  console.log(JSON.stringify({ found: false, supplier_key: supplierKey }));
  process.exit(1);
}

console.log(JSON.stringify({ found: true, key: supplier.key, name: supplier.name, address: supplier.address }));
process.exit(0);
