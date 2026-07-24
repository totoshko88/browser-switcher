#!/bin/bash
# Test script for verifying the icon fix after Gnome Shell restart

set -e

EXTENSION_ID="browser-switcher@totoshko88.github.io"
EXTENSION_DIR="$HOME/.local/share/gnome-shell/extensions/$EXTENSION_ID"

echo "=========================================="
echo "Browser Switcher Icon Fix Test Script"
echo "=========================================="
echo ""

# Check if extension directory exists
if [ ! -d "$EXTENSION_DIR" ]; then
    echo "❌ Extension directory not found: $EXTENSION_DIR"
    echo "Please install the extension first."
    exit 1
fi

echo "✓ Extension directory found"
echo ""

# Copy updated files to extension directory
echo "📦 Copying extension files..."
cp extension.js "$EXTENSION_DIR/"
cp browserManager.js "$EXTENSION_DIR/"
cp indicator.js "$EXTENSION_DIR/"
cp menuBuilder.js "$EXTENSION_DIR/"
cp prefs.js "$EXTENSION_DIR/"
cp metadata.json "$EXTENSION_DIR/"
cp stylesheet.css "$EXTENSION_DIR/"
glib-compile-schemas schemas
mkdir -p "$EXTENSION_DIR/schemas"
cp schemas/org.gnome.shell.extensions.browser-switcher.gschema.xml "$EXTENSION_DIR/schemas/"
cp schemas/gschemas.compiled "$EXTENSION_DIR/schemas/"
echo "✓ Files copied successfully"
echo ""

# Disable and re-enable extension
echo "🔄 Reloading extension..."
gnome-extensions disable "$EXTENSION_ID" 2>/dev/null || true
sleep 1
gnome-extensions enable "$EXTENSION_ID"
sleep 2
echo "✓ Extension reloaded"
echo ""

# Check extension status
STATUS=$(gnome-extensions info "$EXTENSION_ID" | grep "State:" | awk '{print $2}')
echo "Extension status: $STATUS"
echo ""

# Show current default browser
echo "🌐 Current default browser:"
xdg-settings get default-web-browser
echo ""

# Show recent logs
echo "📋 Recent extension logs (last 20 lines):"
echo "=========================================="
journalctl -b -o cat | grep "Browser Switcher" | tail -n 20
echo "=========================================="
echo ""

echo "✅ Test preparation complete!"
echo ""
echo "📝 Manual Testing Steps:"
echo "1. Check the panel - you should see the correct browser icon"
echo "2. Click the icon and select a different browser"
echo "3. Verify the icon changes to the new browser"
echo "4. Restart Gnome Shell:"
echo "   - On X11: Press Alt+F2, type 'r', press Enter"
echo "   - On Wayland: Log out and log back in"
echo "5. After restart, verify the correct browser icon appears immediately"
echo "6. Check logs with: journalctl -f -o cat | grep 'Browser Switcher'"
echo ""
echo "Expected behavior:"
echo "- Icon should show the correct browser immediately after restart"
echo "- Logs should show: 'Post-initialization icon update for browser: <browser-id>'"
echo "- No 'web-browser' fallback icon should appear"
