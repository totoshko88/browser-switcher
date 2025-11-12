# Gnome Browser Switcher

A lightweight Gnome Shell extension for quick default browser switching through the system panel.

## Features

- 🚀 **Simple & Fast** - One-click browser switching
- 🎯 **Zero Configuration** - Works out of the box
- 🪶 **Lightweight** - No external dependencies
- 🔄 **Auto-Detection** - Finds all installed browsers automatically
- 🎨 **Native Integration** - Matches Gnome Shell design

## Use Case

Perfect for users who work with different browser profiles for different tasks (e.g., separate work and personal SSO authentication).

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

- Gnome Shell 45 or 46
- xdg-utils (typically pre-installed)

## License

GPL-3.0 - See [LICENSE](LICENSE) for details.

## Contributing

Contributions welcome! Please ensure:
- Code follows existing style
- Extension remains simple and lightweight
- No external dependencies added
- Tested on Gnome Shell 45 and 46
