#!/usr/bin/env python3
"""Creates a Solana Pay invoice: generates a reference public key, builds the
payment URL, and renders a scannable QR PNG. Prints a single JSON object to
stdout; the calling agent turn is responsible for memory_store and for
starting the invoice-watch SOP.

The reference is 32 cryptographically random bytes, base58-encoded. It is
used ONLY as a read-only account tag so a later RPC call
(getSignaturesForAddress) can find the payment. It never signs anything and
its "private" bytes are discarded immediately after deriving the public
key - there is nothing to leak because nothing is retained.
"""
import argparse
import json
import secrets
import sys
from pathlib import Path
from urllib.parse import quote

try:
    import base58
except ImportError:
    print(json.dumps({"error": "missing dependency: base58 (pip install base58)"}), file=sys.stderr)
    sys.exit(1)

SKILL_DIR = Path(__file__).resolve().parent.parent
CONFIG_PATH = SKILL_DIR / "references" / "merchant_config.json"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--amount", required=True, help="Invoice amount in token units, e.g. 180")
    ap.add_argument("--client", required=True, help="Client name/label for the invoice")
    ap.add_argument("--invoice-id", required=True, help="Internal invoice id, e.g. 412")
    ap.add_argument("--message", default=None, help="Optional message shown in the wallet")
    ap.add_argument("--workspace", required=True, help="Agent workspace root, for saving the QR image")
    ap.add_argument("--config", default=str(CONFIG_PATH), help="Path to merchant config JSON (default: devnet config)")
    args = ap.parse_args()

    cfg = json.loads(Path(args.config).read_text())
    merchant = cfg["merchant_wallet"]
    mint = cfg["usdc_mint"]

    reference_pubkey = base58.b58encode(secrets.token_bytes(32)).decode("ascii")

    label = f"Falou e Provou - fatura {args.invoice_id}"
    message = args.message or f"Cobranca de {args.client} - fatura {args.invoice_id}"

    url = (
        f"solana:{merchant}"
        f"?amount={args.amount}"
        f"&spl-token={mint}"
        f"&reference={reference_pubkey}"
        f"&label={quote(label)}"
        f"&message={quote(message)}"
    )

    qr_path = None
    try:
        import qrcode

        images_dir = Path(args.workspace) / "images"
        images_dir.mkdir(parents=True, exist_ok=True)
        candidate = images_dir / f"invoice-{args.invoice_id}-{reference_pubkey[:8]}.png"
        qrcode.make(url).save(candidate)
        qr_path = str(candidate)
    except Exception as exc:  # QR rendering is a nice-to-have, never block the invoice on it
        print(f"warning: QR generation failed ({exc}); falling back to text-only URL", file=sys.stderr)

    result = {
        "invoice_id": args.invoice_id,
        "client": args.client,
        "amount": args.amount,
        "network": cfg.get("network", "devnet"),
        "rpc_url": cfg["rpc_url"],
        "merchant_wallet": merchant,
        "usdc_mint": mint,
        "reference_pubkey": reference_pubkey,
        "solana_pay_url": url,
        "qr_image_path": qr_path,
        "state": "FALOU",
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
