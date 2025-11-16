// SPDX-License-Identifier: GPL-3.0-or-later
// Menu builder for Gnome Browser Switcher

import GObject from 'gi://GObject';
import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

/**
 * MenuBuilder creates and manages the popup menu for browser selection
 */
class MenuBuilder {
    constructor(indicator, browserManager) {
        this._indicator = indicator;
        this._browserManager = browserManager;
        this._menuItems = new Map(); // Map browser ID to menu item
        this._selectionCallback = null;
        this._timeoutId = null;
        
        // Build initial menu
        this.buildMenu();
        
        // Set up browser change monitoring
        this._setupBrowserChangeMonitoring();
    }

    /**
     * Builds the popup menu with all available browsers
     */
    buildMenu() {
        // Clear existing menu items
        this._indicator.menu.removeAll();
        this._menuItems.clear();
        
        const browsers = this._browserManager.getInstalledBrowsers();
        const currentBrowserId = this._browserManager.getCachedDefaultBrowser();
        
        console.log(`Browser Switcher: Building menu with ${browsers.length} browsers`);
        browsers.forEach(b => console.log(`  - ${b.name} (${b.id})`));
        
        // Handle empty browser list
        if (!browsers || browsers.length === 0) {
            this._addNoBrowsersMessage();
            return;
        }
        
        // Create menu item for each browser
        for (const browser of browsers) {
            this._addBrowserMenuItem(browser, currentBrowserId);
        }
    }

    /**
     * Adds a "No browsers found" message to the menu
     * @private
     */
    _addNoBrowsersMessage() {
        const item = new PopupMenu.PopupMenuItem('No browsers found', {
            reactive: false,
            can_focus: false
        });
        
        this._indicator.menu.addMenuItem(item);
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
            this._getIconForBrowser(browser.icon)
        );
        
        // Add checkmark for current default browser
        if (browser.id === currentBrowserId) {
            this._addCheckmark(item);
        }
        
        // Add click handler
        item.connect('activate', () => {
            this._onBrowserSelected(browser.id);
        });
        
        this._indicator.menu.addMenuItem(item);
        this._menuItems.set(browser.id, item);
    }

    /**
     * Gets a Gio icon for a browser
     * @param {string} iconName - Icon name or path
     * @returns {string} Icon name
     * @private
     */
    _getIconForBrowser(iconName) {
        return iconName || 'web-browser';
    }

    /**
     * Adds a checkmark ornament to a menu item
     * @param {PopupMenu.PopupMenuItem} item - Menu item
     * @private
     */
    _addCheckmark(item) {
        const ornament = new St.Icon({
            icon_name: 'object-select-symbolic',
            style_class: 'popup-menu-ornament',
            y_align: Clutter.ActorAlign.CENTER
        });
        
        item.add_child(ornament);
    }

    /**
     * Handles browser selection from menu
     * @param {string} browserId - Selected browser ID
     * @private
     */
    _onBrowserSelected(browserId) {
        // Attempt to set the default browser
        const success = this._browserManager.setDefaultBrowser(browserId);
        
        if (!success) {
            // Show error notification
            this._showErrorNotification(
                'Failed to switch browser',
                'Could not change the default browser. Check system logs for details.'
            );
            return;
        }
        
        // Update the menu to reflect the change
        this.updateCurrentBrowser(browserId);
        
        // Remove existing timeout if any
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = null;
        }
        
        // Close menu after selection (within 500ms as per requirement)
        this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
            this._indicator.menu.close();
            this._timeoutId = null;
            return GLib.SOURCE_REMOVE;
        });
        
        // Notify callback if registered
        if (this._selectionCallback) {
            try {
                this._selectionCallback(browserId);
            } catch (e) {
                log(`Browser Switcher: Selection callback error: ${e.message}`);
            }
        }
    }

    /**
     * Shows an error notification to the user
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @private
     */
    _showErrorNotification(title, message) {
        try {
            Main.notify(title, message);
        } catch (e) {
            log(`Browser Switcher: Could not show notification: ${e.message}`);
        }
    }

    /**
     * Updates the checkmark position when default browser changes
     * @param {string} browserId - New default browser ID
     */
    updateCurrentBrowser(browserId) {
        // Remove checkmarks from all items
        for (const [id, item] of this._menuItems) {
            // Remove existing ornaments
            const children = item.get_children();
            for (const child of children) {
                if (child instanceof St.Icon && 
                    child.icon_name === 'object-select-symbolic') {
                    item.remove_child(child);
                }
            }
        }
        
        // Add checkmark to the new default browser
        const newDefaultItem = this._menuItems.get(browserId);
        if (newDefaultItem) {
            this._addCheckmark(newDefaultItem);
        }
    }

    /**
     * Sets up monitoring for browser changes
     * @private
     */
    _setupBrowserChangeMonitoring() {
        this._browserManager.watchDefaultBrowser((browserId) => {
            this.updateCurrentBrowser(browserId);
        });
    }

    /**
     * Registers a callback for browser selection events
     * @param {Function} callback - Callback function
     */
    onBrowserSelected(callback) {
        if (callback && typeof callback === 'function') {
            this._selectionCallback = callback;
        }
    }

    /**
     * Cleans up resources
     */
    destroy() {
        // Remove timeout if exists
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = null;
        }
        
        this._menuItems.clear();
        this._selectionCallback = null;
        this._indicator = null;
        this._browserManager = null;
    }
}

export { MenuBuilder };

