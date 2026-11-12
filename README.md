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
| 🪶 Lightweight | No external tools or dependencies |
| 🔄 Auto-Detection | Finds installed browsers, including Flatpak, and picks up installs and removals |
| 🎨 Native Integration | Matches Gnome Shell design, sets the same defaults as GNOME Settings |
| 👁️ Always Accurate | Follows default browser changes made in GNOME Settings or by the browser itself |

## Use Case

Perfect for users who work with different browser profiles for different tasks — for example, separate work and personal SSO authentication.

<img width="1024" alt="Screenshot" src="https://github.com/user-attachments/assets/a0f0f2e4-cc5d-4160-af2b-e2c967b9f226" />

## Installation

### From extensions.gnome.org (Recommended)

https://extensions.gnome.org/extension/8836/browser-switcher/

### Manual Installation

1. Download the latest release from [Releases](https://github.com/totoshko88/browser-switcher/releases)

2. Install and enable:
```bash
gnome-extensions install browser-switcher@totoshko88.github.io.shell-extension.zip
gnome-extensions enable browser-switcher@totoshko88.github.io
```

3. Restart Gnome Shell:
   - **Wayland**: Log out and log back in
   - **X11** (GNOME 49 and earlier): Press `Alt+F2`, type `r`, press Enter

### Uninstallation

```bash
gnome-extensions disable browser-switcher@totoshko88.github.io
gnome-extensions uninstall browser-switcher@totoshko88.github.io
```

## Requirements

- Gnome Shell 45–51
- At least one web browser with a valid `.desktop` file

## How It Works

**Browser Detection**: Lists the applications registered as `x-scheme-handler/http`
handlers through `Gio.AppInfo`, which covers system, user and Flatpak installs.
Applications whose `.desktop` file declares categories without `WebBrowser` are
skipped. Duplicate entries of the same browser (e.g. `google-chrome.desktop` and
`google-chrome-stable.desktop`) are shown once.

**Default Browser**: Selecting a browser makes it the handler for
`x-scheme-handler/http`, plus `x-scheme-handler/https`, `text/html` and
`application/xhtml+xml` when the browser declares them. This is the same set
GNOME Settings changes under *Apps → Default Apps → Web*.

If the current default is a hidden handler, such as the `userapp-Firefox-*.desktop`
file Firefox creates when it makes itself the default, it is listed too, so the
menu and the panel icon always show the real default.

**Change Tracking**: The menu and panel icon update when browsers are installed
or removed and when the default changes outside the extension.

### Panel Icon Appearance

Open Browser Switcher's **Preferences** from Extension Manager and use
**Desaturate panel icon** to choose whether only the system-panel icon is shown
in grayscale. The choice is saved and takes effect immediately; browser icons
in the menu retain their color.

## Development

### Local Testing

```bash
# Automated checks: BrowserManager against the installed browsers (on a copy of
# mimeapps.list) and a headless GNOME Shell smoke test (GNOME Shell 50+)
tests/run-tests.sh

# Lint (ESLint 9+ flat config)
npx eslint@10 .

# Try the extension in a nested Shell window (GNOME Shell 49+);
# on Wayland, disable/enable does not reload changed code in the running Shell
gnome-extensions pack --force --extra-source=browserManager.js \
  --extra-source=indicator.js --extra-source=menuBuilder.js \
  --schema=schemas/org.gnome.shell.extensions.browser-switcher.gschema.xml .
gnome-extensions install --force browser-switcher@totoshko88.github.io.shell-extension.zip
dbus-run-session gnome-shell --devkit

# View logs
journalctl -f -o cat | grep "Browser Switcher"
```

### Building Release

```bash
gnome-extensions pack --force --out-dir=. \
  --extra-source=browserManager.js \
  --extra-source=indicator.js \
  --extra-source=menuBuilder.js \
  --schema=schemas/org.gnome.shell.extensions.browser-switcher.gschema.xml .
```

### Contributing

Contributions welcome! Please ensure:
- Code follows existing style and `npx eslint@10 .` passes
- `tests/run-tests.sh` passes
- Changes follow the [extensions.gnome.org review guidelines](https://gjs.guide/extensions/review-guidelines/review-guidelines.html)

## Support

If you find this extension useful, consider supporting development:

[![Monobank](https://img.shields.io/badge/Monobank-UAH-black)](https://send.monobank.ua/jar/2UgaGcQ3JC)
[![Donatello](https://img.shields.io/badge/Donatello-Support-ff6600)](https://donatello.to/totoshko88)

## License

GPL-3.0 — Made with ❤️ in Ukraine 🇺🇦

