#!/bin/bash
# SPDX-License-Identifier: GPL-3.0-or-later
# Runs the BrowserManager checks and a headless GNOME Shell smoke test.
# The user's mimeapps.list and dconf settings are never modified: the tests
# work on copies inside a temporary XDG_CONFIG_HOME.

set -euo pipefail

cd "$(dirname "$0")/.."
UUID="browser-switcher@totoshko88.github.io"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

echo "== BrowserManager checks"
mkdir -p "$WORK_DIR/config"
USER_MIMEAPPS="${XDG_CONFIG_HOME:-$HOME/.config}/mimeapps.list"
if [ -f "$USER_MIMEAPPS" ]; then
    cp "$USER_MIMEAPPS" "$WORK_DIR/config/"
fi
XDG_CONFIG_HOME="$WORK_DIR/config" gjs -m tests/browser-manager-test.js

echo
echo "== Headless GNOME Shell smoke test"
if ! command -v gnome-shell-test-tool >/dev/null; then
    echo "SKIP: gnome-shell-test-tool not found (GNOME Shell 50+)"
    exit 0
fi

gnome-extensions pack --force --out-dir="$WORK_DIR" \
    --extra-source=browserManager.js \
    --extra-source=indicator.js \
    --extra-source=menuBuilder.js \
    --schema=schemas/org.gnome.shell.extensions.browser-switcher.gschema.xml . >/dev/null

# gnome-shell-test-tool gives the nested Shell its own temporary XDG
# directories; dbus-run-session keeps it off the desktop session bus.
# No --disable-animations: with it GNOME Shell 50.1 never starts the script.
LOG="$WORK_DIR/shell.log"
if ! timeout 120 dbus-run-session -- gnome-shell-test-tool --headless \
    --extension "$WORK_DIR/$UUID.shell-extension.zip" \
    "$PWD/tests/shell-smoke-test.js" >"$LOG" 2>&1; then
    cat "$LOG"
    echo "FAIL: smoke test exited with an error"
    exit 1
fi

if grep -E "Browser Switcher|$UUID" "$LOG" | grep -iE "error|exception|failed"; then
    echo "FAIL: extension errors in the Shell log"
    exit 1
fi
grep -E "^(PASS|FAIL)" "$LOG" || true
echo "Smoke test passed"
