// SPDX-License-Identifier: GPL-3.0-or-later
// Menu builder for Gnome Browser Switcher

import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

/**
 * MenuBuilder creates and manages the popup menu for browser selection
 */
class MenuBuilder {
    constructor(indicator, browserManager) {
        this._indicator = indicator;
        this._browserManager = browserManager;
        this._menuItems = new Map();

        this.buildMenu();

        this._browserManager.watchDefaultBrowser((browserId) => {
            this.updateCurrentBrowser(browserId);
        });

        // Re-detect browsers when the menu opens so newly installed or
        // removed browsers appear without restarting the Shell. Detection
        // is cheap (Gio.AppInfo reads the cached application database).
        // connectObject() tracks the handler against this builder for cleanup.
        this._indicator.menu.connectObject(
            'open-state-changed',
            (_menu, open) => {
                if (open) {
                    this._browserManager.refresh();
                    this.buildMenu();
                }
            },
            this
        );
    }

    /**
     * Builds the popup menu with all available browsers
     */
    buildMenu() {
        // Disconnect activate handlers tracked against this builder before
        // the items are destroyed by removeAll().
        for (const item of this._menuItems.values())
            item.disconnectObject(this);

        this._indicator.menu.removeAll();
        this._menuItems.clear();

        const browsers = this._browserManager.getInstalledBrowsers();
        const currentBrowserId = this._browserManager.getCachedDefaultBrowser();

        if (!browsers || browsers.length === 0) {
            const item = new PopupMenu.PopupMenuItem('No browsers found', {
                reactive: false,
                can_focus: false,
            });
            this._indicator.menu.addMenuItem(item);
        } else {
            for (const browser of browsers) {
                this._addBrowserMenuItem(browser, currentBrowserId);
            }
        }
    }

    /**
     * Adds a menu item for a browser
     * @param {Object} browser - Browser object
     * @param {string} currentBrowserId - ID of current default browser
     * @private
     */
    _addBrowserMenuItem(browser, currentBrowserId) {
        const item = new PopupMenu.PopupImageMenuItem(
            browser.name,
            browser.gicon ?? 'web-browser'
        );

        // Use built-in ornament API for checkmarks (GNOME HIG compliant)
        if (browser.id === currentBrowserId)
            item.setOrnament(PopupMenu.Ornament.CHECK);
        else
            item.setOrnament(PopupMenu.Ornament.NONE);

        item.connectObject('activate', () => {
            this._onBrowserSelected(browser.id);
        }, this);

        this._indicator.menu.addMenuItem(item);
        this._menuItems.set(browser.id, item);
    }

    /**
     * Handles browser selection from menu
     * @param {string} browserId - Selected browser ID
     * @private
     */
    _onBrowserSelected(browserId) {
        const success = this._browserManager.setDefaultBrowser(browserId);

        if (!success) {
            try {
                Main.notify(
                    'Browser Switcher',
                    'Could not change the default browser.'
                );
            } catch (e) {
                console.error(`Browser Switcher: Could not show notification: ${e.message}`);
            }
            return;
        }

        this.updateCurrentBrowser(browserId);
    }

    /**
     * Updates the ornament position when default browser changes
     * @param {string} browserId - New default browser ID
     */
    updateCurrentBrowser(browserId) {
        for (const [id, item] of this._menuItems) {
            item.setOrnament(
                id === browserId
                    ? PopupMenu.Ornament.CHECK
                    : PopupMenu.Ornament.NONE
            );
        }
    }

    /**
     * Cleans up resources
     */
    destroy() {
        for (const item of this._menuItems.values())
            item.disconnectObject(this);

        if (this._indicator?.menu)
            this._indicator.menu.disconnectObject(this);

        this._menuItems.clear();
        this._indicator = null;
        this._browserManager = null;
    }
}

export { MenuBuilder };
