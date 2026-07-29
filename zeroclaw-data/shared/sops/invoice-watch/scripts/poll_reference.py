#!/usr/bin/env python3
"""Polls a Solana reference key for a signed payment and validates it.

Owns the full proof loop for one invoice-watch run:
  1. getSignaturesForAddress on the reference key, retried until a signature
     appears or --timeout-secs elapses.
  2. getTransaction (jsonParsed) on the first signature found.
  3. Validate: the merchant's post/pre SPL-token balance delta for the
     configured mint must be >= the invoiced amount. A signature alone is
     never sufficient - this is the check that stops reference-key reuse and
     wrong-amount payments from being accepted as proof.

Prints exactly one JSON object to stdout:
  {"found": bool, "valid": bool, "signature": str|null, "reason": str|null}

Never raises on a normal "not found yet" / "wrong amount" outcome - those are
expected results, encoded in the JSON, not process failures. This keeps the
calling SOP step's tool output small and shaped instead of forwarding raw RPC
JSON into the model's context.
"""
import argparse
import json
import sys
import time
import urllib.request
from urllib.error import URLError


def rpc_call(rpc_url: str, method: str, params: list, timeout: float = 15.0) -> dict:
    payload = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode()
    req = urllib.request.Request(
        rpc_url, data=payload, headers={"Content-Type": "application/json"}, method="POST"
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read())


def find_signature(rpc_url: str, reference: str) -> str | None:
    resp = rpc_call(rpc_url, "getSignaturesForAddress", [reference, {"limit": 5}])
    result = resp.get("result") or []
    # Oldest first: a reference should only ever receive one payment; if
    # several exist, validate the earliest confirmed one.
    result = sorted(result, key=lambda r: r.get("slot", 0))
    for entry in result:
        if entry.get("err") is None:
            return entry["signature"]
    return None


def validate_payment(rpc_url: str, signature: str, merchant_wallet: str, usdc_mint: str, expected_amount: float):
    resp = rpc_call(
        rpc_url,
        "getTransaction",
        [signature, {"encoding": "jsonParsed", "maxSupportedTransactionVersion": 0}],
    )
    tx = resp.get("result")
    if tx is None:
        return False, "transacao nao encontrada via getTransaction (pode ainda nao estar confirmada)"

    meta = tx.get("meta") or {}
    pre = meta.get("preTokenBalances") or []
    post = meta.get("postTokenBalances") or []

    def balances_for(entries):
        out = {}
        for e in entries:
            if e.get("mint") == usdc_mint and e.get("owner") == merchant_wallet:
                amt = e.get("uiTokenAmount", {}).get("uiAmount") or 0
                out[e.get("accountIndex")] = amt
        return out

    pre_bal = balances_for(pre)
    post_bal = balances_for(post)

    if not post_bal:
        return False, f"nenhum saldo do mint {usdc_mint} para o owner {merchant_wallet} nesta transacao"

    delta = 0.0
    for idx, post_amt in post_bal.items():
        delta += post_amt - pre_bal.get(idx, 0.0)

    if delta + 1e-9 < float(expected_amount):
        return False, f"valor recebido ({delta}) menor que o valor da fatura ({expected_amount})"

    return True, None


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--reference", required=True)
    ap.add_argument("--amount", required=True, type=float)
    ap.add_argument("--usdc-mint", required=True)
    ap.add_argument("--merchant-wallet", required=True)
    ap.add_argument("--rpc-url", required=True)
    ap.add_argument("--timeout-secs", type=int, default=600)
    ap.add_argument("--poll-interval-secs", type=int, default=5)
    args = ap.parse_args()

    deadline = time.monotonic() + args.timeout_secs
    signature = None
    last_error = None

    while time.monotonic() < deadline:
        try:
            signature = find_signature(args.rpc_url, args.reference)
        except URLError as exc:
            last_error = str(exc)
            signature = None
        if signature:
            break
        time.sleep(args.poll_interval_secs)

    if not signature:
        reason = "timeout: nenhuma assinatura confirmada na reference dentro do prazo"
        if last_error:
            reason += f" (ultimo erro de rede: {last_error})"
        print(json.dumps({"found": False, "valid": False, "signature": None, "reason": reason}))
        return

    try:
        valid, reason = validate_payment(
            args.rpc_url, signature, args.merchant_wallet, args.usdc_mint, args.amount
        )
    except URLError as exc:
        print(json.dumps({
            "found": True, "valid": False, "signature": signature,
            "reason": f"falha ao validar via getTransaction: {exc}",
        }))
        return

    print(json.dumps({"found": True, "valid": valid, "signature": signature, "reason": reason}))


if __name__ == "__main__":
    main()
