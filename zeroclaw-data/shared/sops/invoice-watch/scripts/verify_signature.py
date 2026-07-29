#!/usr/bin/env python3
"""Independent second check before anything is ever recorded as PROVOU.

This is deliberate defense-in-depth, not redundancy: Step 1 (poll_reference.py)
already validates a payment before reporting `valid: true`, but Step 1's
result reaches Step 2 only as text in the model's own turn - a compromised or
simply mistaken model could, in principle, report an invalid/fabricated
result as valid. This script takes only a bare signature and re-derives the
proof directly from the chain again, from scratch, independently of
whatever Step 1 claimed. Step 2 must run this and only write PROVOU if it
also says valid:true - never based on Step 1's report alone.

This is exactly the check that would have caught (and, in production, will
catch) a fabricated signature: a made-up string fails at the RPC call itself
before any balance logic even runs.

Prints one JSON object: {"valid": bool, "signature": str, "reason": str|null}
Exit code is 0 if the RPC call itself succeeded (regardless of valid True/False)
and nonzero only on a genuine network/RPC failure to reach the source at all.
"""
import argparse
import json
import sys

from poll_reference import rpc_call, validate_payment  # same directory


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--signature", required=True)
    ap.add_argument("--amount", required=True, type=float)
    ap.add_argument("--usdc-mint", required=True)
    ap.add_argument("--merchant-wallet", required=True)
    ap.add_argument("--rpc-url", required=True)
    args = ap.parse_args()

    try:
        valid, reason = validate_payment(
            args.rpc_url, args.signature, args.merchant_wallet, args.usdc_mint, args.amount
        )
    except Exception as exc:  # malformed signature, RPC rejection, network error - all mean NOT independently confirmed
        print(json.dumps({
            "valid": False,
            "signature": args.signature,
            "reason": f"independent re-check failed: {exc}",
        }))
        return

    print(json.dumps({"valid": valid, "signature": args.signature, "reason": reason}))


if __name__ == "__main__":
    main()
