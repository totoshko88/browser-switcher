# Gnome Browser Switcher

A lightweight Gnome Shell extension for quick default browser switching through the system panel.

## Features

- 🚀 **Simple & Fast** - One-click browser switching
- 🎯 **Zero Configuration** - Works out of the box
- 🪶 **Lightweight** - No external dependencies
- 🔄 **Auto-Detection** - Finds all installed browsers automatically
- 🎨 **Native Integration** - Matches Gnome Shell design
- ⚡ **Non-Blocking** - Uses async subprocess calls for smooth performance

## Use Case

Perfect for users who work with different browser profiles for different tasks (e.g., separate work and personal SSO authentication).

## Recent Changes

### v1.1 (November 2024)
- ✅ **Fixed**: Replaced synchronous subprocess calls with async implementation
- ✅ **Improved**: Cleaner logs - reduced noise from non-browser .desktop files
- ✅ **Enhanced**: Better error handling and fallback mechanisms
- ✅ **Compliant**: Now fully compatible with extensions.gnome.org guidelines

<img width="1024" height="768" alt="1" src="https://github.com/user-attachments/assets/a0f0f2e4-cc5d-4160-af2b-e2c967b9f226" />

## Installation

### From extensions.gnome.org (Recommended)

Coming soon after initial release.

### Manual Installation

Download the latest release ZIP file from [Releases](https://github.com/totoshko88/browser-switcher/releases) and install:

```bash
gnome-extensions install browser-switcher@totoshko88.github.io.shell-extension.zip
gnome-extensions enable browser-switcher@totoshko88.github.io
```

Then restart Gnome Shell:
- On X11: Press `Alt+F2`, type `r`, and press Enter
- On Wayland: Log out and log back in

### Uninstallation

```bash
gnome-extensions disable browser-switcher@totoshko88.github.io
gnome-extensions uninstall browser-switcher@totoshko88.github.io
```

## Requirements

- Gnome Shell 45+
- xdg-utils (typically pre-installed on most Linux distributions)
- At least one web browser installed with a valid .desktop file

## Technical Details

### Browser Detection
The extension scans standard XDG directories for `.desktop` files with the `WebBrowser` category:
- `/usr/share/applications`
- `/usr/local/share/applications`
- `~/.local/share/applications`

### Default Browser Management
Uses `xdg-settings` as the primary method for getting/setting the default browser. This ensures compatibility across different desktop environments and follows XDG standards.

### Performance
All subprocess calls are asynchronous to prevent blocking the Gnome Shell UI thread, ensuring smooth performance even during browser detection and switching operations.

## Support the Project

If you find this extension useful, consider supporting its development:

- ☕ **Ko-Fi**: [ko-fi.com/totoshko88](https://ko-fi.com/totoshko88)
- 💳 **PayPal/Payoneer**: totoshko88@gmail.com
- 🇺🇦 **UAH (Monobank)**: [send.monobank.ua/jar/2UgaGcQ3JC](https://send.monobank.ua/jar/2UgaGcQ3JC)

## License

GPL-3.0 - See [LICENSE](LICENSE) for details.

## Contributing

Contributions welcome! Please ensure:
- Code follows existing style
- Extension remains simple and lightweight
- No external dependencies added
- All subprocess calls are asynchronous (no sync spawns)
- Tested on Gnome Shell 45+

## Development

### Testing Locally
```bash
# Copy files to extension directory
cp *.js ~/.local/share/gnome-shell/extensions/browser-switcher@totoshko88.github.io/

# Restart extension
gnome-extensions disable browser-switcher@totoshko88.github.io
gnome-extensions enable browser-switcher@totoshko88.github.io

# View logs
journalctl -f -o cat | grep "Browser Switcher"
```

### Building Release Package
```bash
gnome-extensions pack --force --out-dir=. \
  --extra-source=browserManager.js \
  --extra-source=indicator.js \
  --extra-source=menuBuilder.js .
```
