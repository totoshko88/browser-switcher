# Gnome Browser Switcher

<p align="center">
  <img src="screenshots/ico.png" alt="Browser Switcher Icon" width="128">
</p>

<p align="center">
  <strong>One-click default browser switching from the Gnome Shell panel</strong>
</p>

<p align="center">
  <a href="#installation">Installation</a> •
  <a href="#features">Features</a> •
  <a href="#requirements">Requirements</a> •
  <a href="#development">Development</a> •
  <a href="#support">Support</a>
</p>

---

## Features

| Feature | Description |
|---------|-------------|
| 🚀 Simple & Fast | One-click browser switching |
| 🎯 Zero Configuration | Works out of the box |
| 🪶 Lightweight | No external dependencies |
| 🔄 Auto-Detection | Finds all installed browsers automatically |
| 🎨 Native Integration | Matches Gnome Shell design |
| ⚡ Non-Blocking | Async operations for smooth performance |

## Use Case

Perfect for users who work with different browser profiles for different tasks — for example, separate work and personal SSO authentication.

<img width="1024" alt="Screenshot" src="https://github.com/user-attachments/assets/a0f0f2e4-cc5d-4160-af2b-e2c967b9f226" />

## Installation

### From extensions.gnome.org (Recommended)

Coming soon after initial release.

### Manual Installation

1. Download the latest release from [Releases](https://github.com/totoshko88/browser-switcher/releases)

2. Install and enable:
```bash
gnome-extensions install browser-switcher@totoshko88.github.io.shell-extension.zip
gnome-extensions enable browser-switcher@totoshko88.github.io
```

3. Restart Gnome Shell:
   - **X11**: Press `Alt+F2`, type `r`, press Enter
   - **Wayland**: Log out and log back in

### Uninstallation

```bash
gnome-extensions disable browser-switcher@totoshko88.github.io
gnome-extensions uninstall browser-switcher@totoshko88.github.io
```

## Requirements

- Gnome Shell 45, 46, 47, 48, or 49
- `xdg-utils` (pre-installed on most Linux distributions)
- At least one web browser with a valid `.desktop` file

## How It Works

**Browser Detection**: Scans XDG directories for `.desktop` files with `WebBrowser` category:
- `/usr/share/applications`
- `/usr/local/share/applications`
- `~/.local/share/applications`

**Default Browser Management**: Uses `xdg-settings` for cross-desktop compatibility.

## Development

### Local Testing

```bash
# Copy to extension directory
cp *.js ~/.local/share/gnome-shell/extensions/browser-switcher@totoshko88.github.io/

# Restart extension
gnome-extensions disable browser-switcher@totoshko88.github.io
gnome-extensions enable browser-switcher@totoshko88.github.io

# View logs
journalctl -f -o cat | grep "Browser Switcher"
```

### Building Release

```bash
gnome-extensions pack --force --out-dir=. \
  --extra-source=browserManager.js \
  --extra-source=indicator.js \
  --extra-source=menuBuilder.js .
```

### Contributing

Contributions welcome! Please ensure:
- Code follows existing style
- All subprocess calls are asynchronous
- Tested on Gnome Shell 45+

## Support

If you find this extension useful, consider supporting development:

[![Ko-Fi](https://img.shields.io/badge/Ko--Fi-Support-ff5e5b?logo=ko-fi)](https://ko-fi.com/totoshko88)
[![PayPal](https://img.shields.io/badge/PayPal-Donate-00457C?logo=paypal)](https://www.paypal.com/qrcodes/p2pqrc/JJLUXRZSQ5V3A)
[![Monobank](https://img.shields.io/badge/Monobank-UAH-black)](https://send.monobank.ua/jar/2UgaGcQ3JC)

## License

GPL-3.0 — Made with ❤️ in Ukraine 🇺🇦
