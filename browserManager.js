// SPDX-License-Identifier: GPL-3.0-or-later
// Browser detection and management for Gnome Browser Switcher

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

/**
 * BrowserManager handles browser detection, default browser management,
 * and monitoring of browser changes.
 *
 * Uses Gio.AppInfo instead of manual .desktop parsing and xdg-settings
 * subprocesses: get_all_for_type() handles NoDisplay/Hidden/Flatpak exports,
 * and set_as_default_for_type() works without external tools.
 */
class BrowserManager {
    constructor() {
        this._browsers = [];
        this._currentDefault = null;
        this._changeCallbacks = [];
        this._appInfoMonitor = null;
        this._appInfoMonitorSignalId = null;
        this._fileMonitor = null;
        this._fileMonitorSignalId = null;
        this._debounceTimeoutId = null;
    }

    /**
     * Initializes the manager by detecting browsers and fetching the
     * current default browser. Synchronous: Gio.AppInfo reads from the
     * cached application database, so this is cheap.
     * @returns {string|null} The initial default browser ID
     */
    initialize() {
        this.refresh();
        this._setupMonitors();
        return this._currentDefault;
    }

    /**
     * Re-detects installed browsers and the current default.
     */
    refresh() {
        this._detectBrowsers();
        this._currentDefault = this.getCurrentDefaultBrowser();
    }

    /**
     * Returns the list of detected browsers
     * @returns {Array} Array of browser objects
     */
    getInstalledBrowsers() {
        return this._browsers;
    }

    /**
     * Detects all installed browsers via the http URL handler registry.
     * @private
     */
    _detectBrowsers() {
        this._browsers = [];

        for (const appInfo of Gio.AppInfo.get_all_for_type('x-scheme-handler/http')) {
            if (!appInfo.should_show())
                continue;

            const browser = {
                id: appInfo.get_id(),
                name: appInfo.get_display_name(),
                gicon: appInfo.get_icon(),
                appInfo,
            };

            // Deduplicate by ID or display name (e.g. google-chrome.desktop
            // vs google-chrome-stable.desktop are the same browser)
            const existingBrowser = this._browsers.find(b =>
                b.id === browser.id || b.name === browser.name
            );
            if (!existingBrowser)
                this._browsers.push(browser);
        }

        if (this._browsers.length === 0)
            console.warn('Browser Switcher: No browsers found');
    }

    /**
     * Gets the current default browser ID.
     * @returns {string|null} The desktop file ID or null
     */
    getCurrentDefaultBrowser() {
        const appInfo = Gio.AppInfo.get_default_for_type('x-scheme-handler/http', false);
        return appInfo ? appInfo.get_id() : null;
    }

    /**
     * Returns the cached current default browser.
     * @returns {string|null}
     */
    getCachedDefaultBrowser() {
        return this._currentDefault;
    }

    /**
     * Sets the default browser for web content types.
     * @param {string} browserId - Browser ID (desktop file name)
     * @returns {boolean} true on success, false on failure
     */
    setDefaultBrowser(browserId) {
        const browser = this._browsers.find(b => b.id === browserId);
        if (!browser) {
            console.error(`Browser Switcher: Unknown browser ID: ${browserId}`);
            return false;
        }

        try {
            for (const contentType of [
                'x-scheme-handler/http',
                'x-scheme-handler/https',
                'text/html',
            ])
                browser.appInfo.set_as_default_for_type(contentType);
        } catch (e) {
            console.error(`Browser Switcher: Failed to set default browser: ${e.message}`);
            return false;
        }

        if (this._currentDefault !== browserId) {
            this._currentDefault = browserId;
            this._notifyChange(browserId);
        }

        return true;
    }

    /**
     * Watches for changes to the default browser
     * @param {Function} callback - Callback function to call when browser changes
     */
    watchDefaultBrowser(callback) {
        if (callback && typeof callback === 'function')
            this._changeCallbacks.push(callback);
    }

    /**
     * Sets up monitoring for browser changes: the application database
     * (installs/removals) and the user mimeapps.list (default handler
     * changes made externally, e.g. via GNOME Settings or xdg-settings).
     * @private
     */
    _setupMonitors() {
        this._appInfoMonitor = Gio.AppInfoMonitor.get();
        this._appInfoMonitorSignalId = this._appInfoMonitor.connect('changed', () => {
            this._onBrowserConfigChanged();
        });

        const configPath = GLib.build_filenamev([
            GLib.get_user_config_dir(),
            'mimeapps.list',
        ]);
        const file = Gio.File.new_for_path(configPath);

        try {
            this._fileMonitor = file.monitor_file(Gio.FileMonitorFlags.NONE, null);
            this._fileMonitorSignalId = this._fileMonitor.connect('changed', () => {
                this._onBrowserConfigChanged();
            });
        } catch (e) {
            console.error(`Browser Switcher: Could not set up file monitor: ${e.message}`);
        }
    }

    /**
     * Handles browser configuration changes with debounce
     * @private
     */
    _onBrowserConfigChanged() {
        // Debounce: monitors can fire multiple events for a single change
        if (this._debounceTimeoutId) {
            GLib.source_remove(this._debounceTimeoutId);
            this._debounceTimeoutId = null;
        }

        this._debounceTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 250, () => {
            this._debounceTimeoutId = null;

            const previousDefault = this._currentDefault;
            this.refresh();
            if (this._currentDefault !== previousDefault)
                this._notifyChange(this._currentDefault);

            return GLib.SOURCE_REMOVE;
        });
    }

    /**
     * Notifies all registered callbacks of browser change
     * @param {string} browserId - New browser ID
     * @private
     */
    _notifyChange(browserId) {
        for (const callback of this._changeCallbacks) {
            try {
                callback(browserId);
            } catch (e) {
                console.error(`Browser Switcher: Callback error: ${e.message}`);
            }
        }
    }

    /**
     * Cleans up resources
     */
    destroy() {
        if (this._debounceTimeoutId) {
            GLib.source_remove(this._debounceTimeoutId);
            this._debounceTimeoutId = null;
        }

        if (this._appInfoMonitor) {
            if (this._appInfoMonitorSignalId) {
                this._appInfoMonitor.disconnect(this._appInfoMonitorSignalId);
                this._appInfoMonitorSignalId = null;
            }
            this._appInfoMonitor = null;
        }

        if (this._fileMonitor) {
            if (this._fileMonitorSignalId) {
                this._fileMonitor.disconnect(this._fileMonitorSignalId);
                this._fileMonitorSignalId = null;
            }
            this._fileMonitor.cancel();
            this._fileMonitor = null;
        }

        this._changeCallbacks = [];
        this._browsers = [];
        this._currentDefault = null;
    }
}

export { BrowserManager };
