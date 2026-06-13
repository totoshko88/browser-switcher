// SPDX-License-Identifier: GPL-3.0-or-later
// Gnome Browser Switcher Extension Entry Point

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

// Import extension components
import { BrowserManager } from './browserManager.js';
import { BrowserIndicator } from './indicator.js';
import { MenuBuilder } from './menuBuilder.js';

/**
 * Extension class for Browser Switcher
 */
export default class BrowserSwitcherExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._browserManager = null;
        this._indicator = null;
        this._menuBuilder = null;
    }

    /**
     * Enable the extension
     * Called when the extension is enabled
     */
    enable() {
        // Instantiate and initialize the browser manager first.
        // initialize() is synchronous (Gio.AppInfo reads the cached app
        // database), so browsers and the current default are ready before
        // the UI components query them.
        this._browserManager = new BrowserManager();
        const currentBrowser = this._browserManager.initialize();

        // Create indicator with browser manager reference
        this._indicator = new BrowserIndicator(this._browserManager);

        // Add indicator to system panel
        Main.panel.addToStatusArea('browser-switcher-indicator', this._indicator);

        // Connect indicator to menu builder (builds the menu from detected browsers)
        this._menuBuilder = new MenuBuilder(this._indicator, this._browserManager);

        // Show the indicator with the correct icon
        this._indicator.show();
        if (currentBrowser)
            this._indicator.updateIcon(currentBrowser);
    }

    /**
     * Disable the extension
     * Called when the extension is disabled or Gnome Shell restarts
     */
    disable() {
        // Cleanup menu builder
        if (this._menuBuilder) {
            this._menuBuilder.destroy();
            this._menuBuilder = null;
        }

        // Cleanup and remove indicator
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }

        // Cleanup browser manager
        if (this._browserManager) {
            this._browserManager.destroy();
            this._browserManager = null;
        }
    }
}
