#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/extension"
OUT="$ROOT/public/cc-feedback-extension.tar.gz"

VERSION=$(node -p "require('$SRC/manifest.json').version")

tar -czf "$OUT" -C "$ROOT" extension

echo "✓ Packaged extension v$VERSION → public/cc-feedback-extension.tar.gz"
