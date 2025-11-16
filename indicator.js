// SPDX-License-Identifier: GPL-3.0-or-later
// System panel indicator for Gnome Browser Switcher

import GObject from 'gi://GObject';
import St from 'gi://St';
import Gio from 'gi://Gio';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

/**
 * BrowserIndicator displays the current browser icon in the system panel
 * and provides access to the browser switching menu.
 */
var BrowserIndicator = GObject.registerClass(
class BrowserIndicator extends PanelMenu.Button {
    _init(browserManager) {
        super._init(0.0, 'Browser Switcher Indicator');
        
        this._browserManager = browserManager;
        this._icon = null;
        
        // Create the icon widget
        this._createIcon();
        
        // Set up browser change monitoring
        this._setupBrowserChangeMonitoring();
        
        // Initialize with current browser icon (use cached value)
        const currentBrowser = this._browserManager.getCachedDefaultBrowser();
        if (currentBrowser) {
            this.updateIcon(currentBrowser);
        }
    }

    /**
     * Creates the icon widget for the panel
     * @private
     */
    _createIcon() {
        this._icon = new St.Icon({
            gicon: Gio.icon_new_for_string('web-browser'),
            style_class: 'system-status-icon'
        });
        
        this.add_child(this._icon);
    }

    /**
     * Sets up monitoring for browser changes
     * @private
     */
    _setupBrowserChangeMonitoring() {
        this._browserManager.watchDefaultBrowser((browserId) => {
            this.updateIcon(browserId);
        });
    }

    /**
     * Updates the indicator icon to match the specified browser
     * @param {string} browserId - Browser ID (desktop file name)
     */
    updateIcon(browserId) {
        if (!browserId) {
            // Use fallback icon
            this._setIconFromName('web-browser');
            return;
        }
        
        // Find the browser in the list
        const browsers = this._browserManager.getInstalledBrowsers();
        const browser = browsers.find(b => b.id === browserId);
        
        if (browser && browser.icon) {
            this._setIconFromName(browser.icon);
        } else {
            // Fallback to generic browser icon
            this._setIconFromName('web-browser');
        }
    }

    /**
     * Sets the icon from an icon name or path
     * @param {string} iconName - Icon name or path
     * @private
     */
    _setIconFromName(iconName) {
        try {
            const gicon = Gio.icon_new_for_string(iconName);
            this._icon.gicon = gicon;
        } catch (e) {
            // If icon loading fails, use fallback
            log(`Browser Switcher: Could not load icon ${iconName}: ${e.message}`);
            try {
                this._icon.gicon = Gio.icon_new_for_string('web-browser');
            } catch (fallbackError) {
                log(`Browser Switcher: Could not load fallback icon: ${fallbackError.message}`);
            }
        }
    }

    /**
     * Shows the indicator in the panel
     */
    show() {
        this.visible = true;
    }

    /**
     * Hides the indicator from the panel
     */
    hide() {
        this.visible = false;
    }

    /**
     * Cleans up resources when the indicator is destroyed
     */
    destroy() {
        // Clean up icon
        if (this._icon) {
            this._icon = null;
        }
        
        // Clean up browser manager reference
        this._browserManager = null;
        
        // Call parent destroy
        super.destroy();
    }
});

export { BrowserIndicator };
