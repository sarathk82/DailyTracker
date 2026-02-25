#!/usr/bin/env bash
# Installs the .githooks directory as the active git hooks path.
# Run once after cloning: bash scripts/install-hooks.sh

set -e

HOOKS_DIR=".githooks"
ROOT=$(git rev-parse --show-toplevel)

chmod +x "$ROOT/$HOOKS_DIR/"*
git config core.hooksPath "$HOOKS_DIR"

echo "✅ Git hooks installed from $HOOKS_DIR"
echo "   Pre-commit test gate is now active for master commits."
