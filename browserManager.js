// SPDX-License-Identifier: GPL-3.0-or-later
// Browser detection and management for Gnome Browser Switcher

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

// Promisify async methods per GJS guide recommendations
Gio._promisify(Gio.Subprocess.prototype, 'communicate_utf8_async');
Gio._promisify(Gio.Subprocess.prototype, 'wait_check_async');

/**
 * BrowserManager handles browser detection, default browser management,
 * and monitoring of browser changes.
 */
class BrowserManager {
    constructor() {
        this._browsers = [];
        this._currentDefault = null;
        this._changeCallbacks = [];
        this._fileMonitor = null;
        this._fileMonitorSignalId = null;
        this._debounceTimeoutId = null;
    }

    /**
     * Asynchronously initializes the manager by detecting browsers
     * and fetching the current default browser.
     * @returns {Promise<string|null>} Promise resolving to the initial default browser ID
     */
    async initialize() {
        // Detect browsers during enable(), not in constructor (review guideline #1)
        this._detectBrowsers();

        this._currentDefault = await this.getCurrentDefaultBrowser();
        console.log(`Browser Switcher: Initial default browser is ${this._currentDefault}`);

        this._setupFileMonitor();

        return this._currentDefault;
    }

    /**
     * Returns the list of detected browsers
     * @returns {Array} Array of browser objects
     */
    getInstalledBrowsers() {
        return this._browsers;
    }

    /**
     * Detects all installed browsers by scanning .desktop files
     * @private
     */
    _detectBrowsers() {
        this._browsers = [];

        // Standard XDG directories to scan (system + user)
        const searchPaths = [
            ...GLib.get_system_data_dirs(),
            GLib.get_user_data_dir(),
        ];

        for (const path of searchPaths) {
            this._scanDirectory(GLib.build_filenamev([path, 'applications']));
        }

        // Flatpak user-installed applications
        // Note: This path is not included in standard XDG_DATA_DIRS but contains
        // .desktop files for user-installed Flatpaks
        const flatpakUserDir = GLib.build_filenamev([
            GLib.get_home_dir(), '.local', 'share', 'flatpak', 'exports', 'share', 'applications'
        ]);
        this._scanDirectory(flatpakUserDir);

        if (this._browsers.length === 0) {
            console.warn('Browser Switcher: No browsers found');
        }
    }

    /**
     * Scans a directory for .desktop files
     * @param {string} dirPath - Directory path to scan
     * @private
     */
    _scanDirectory(dirPath) {
        const dir = Gio.File.new_for_path(dirPath);

        try {
            const enumerator = dir.enumerate_children(
                'standard::name,standard::type',
                Gio.FileQueryInfoFlags.NONE,
                null
            );

            let fileInfo;
            while ((fileInfo = enumerator.next_file(null)) !== null) {
                const fileName = fileInfo.get_name();

                if (fileName.endsWith('.desktop')) {
                    const filePath = GLib.build_filenamev([dirPath, fileName]);
                    this._parseDesktopFile(filePath, fileName);
                }
            }

            enumerator.close(null);
        } catch (_e) {
            // Directory doesn't exist or can't be read — expected for some paths
        }
    }

    /**
     * Parses a .desktop file and extracts browser information
     * @param {string} filePath - Path to .desktop file
     * @param {string} fileName - Name of the file
     * @private
     */
    _parseDesktopFile(filePath, fileName) {
        const keyFile = new GLib.KeyFile();

        try {
            keyFile.load_from_file(filePath, GLib.KeyFileFlags.NONE);

            // Skip hidden or non-displayable entries
            try {
                if (keyFile.get_boolean('Desktop Entry', 'NoDisplay'))
                    return;
            } catch (_e) { /* field absent — not hidden */ }

            try {
                if (keyFile.get_boolean('Desktop Entry', 'Hidden'))
                    return;
            } catch (_e) { /* field absent — not hidden */ }

            try {
                const categories = keyFile.get_string('Desktop Entry', 'Categories');
                if (!categories || !categories.includes('WebBrowser'))
                    return;
            } catch (_e) {
                return;
            }

            const name = keyFile.get_string('Desktop Entry', 'Name');
            const exec = keyFile.get_string('Desktop Entry', 'Exec');
            let icon = 'web-browser';

            try {
                icon = keyFile.get_string('Desktop Entry', 'Icon');
            } catch (_e) {
                // Icon field is optional
            }

            const browser = {
                id: fileName,
                name: name,
                icon: icon,
                execPath: exec.split(' ')[0],
                desktopFile: filePath,
            };

            // Check for duplicates by ID or display name
            // Note: Flatpak browsers all use /usr/bin/flatpak as exec path,
            // so checking by execPath would cause false duplicates.
            // Checking by name catches cases like google-chrome.desktop
            // and google-chrome-stable.desktop which are the same browser.
            const existingBrowser = this._browsers.find(b =>
                b.id === browser.id || b.name === browser.name
            );
            if (!existingBrowser)
                this._browsers.push(browser);
        } catch (_e) {
            // Failed to parse desktop file — skip silently
        }
    }

    /**
     * Gets the current default browser asynchronously using promisified Gio.Subprocess.
     * @returns {Promise<string|null>} Promise resolving to the browser ID or null
     */
    async getCurrentDefaultBrowser() {
        try {
            const proc = Gio.Subprocess.new(
                ['xdg-settings', 'get', 'default-web-browser'],
                Gio.SubprocessFlags.STDOUT_PIPE
            );

            const [stdout] = await proc.communicate_utf8_async(null, null);

            if (stdout) {
                const browserId = stdout.trim();
                if (browserId)
                    return browserId;
            }
        } catch (e) {
            console.warn(`Browser Switcher: xdg-settings failed: ${e.message}`);
        }

        return null;
    }

    /**
     * Returns the cached current default browser.
     * @returns {string|null}
     */
    getCachedDefaultBrowser() {
        return this._currentDefault;
    }

    /**
     * Sets the default browser asynchronously.
     * @param {string} browserId - Browser ID (desktop file name)
     * @returns {Promise<boolean>} true on success, false on failure
     */
    async setDefaultBrowser(browserId) {
        if (!browserId) {
            console.error('Browser Switcher: Invalid browser ID');
            return false;
        }

        try {
            const proc = Gio.Subprocess.new(
                ['xdg-settings', 'set', 'default-web-browser', browserId],
                Gio.SubprocessFlags.NONE
            );

            const success = await proc.wait_check_async(null);

            if (success && this._currentDefault !== browserId) {
                this._currentDefault = browserId;
                this._notifyChange(browserId);
            }

            return success;
        } catch (e) {
            console.error(`Browser Switcher: Failed to set default browser: ${e.message}`);
            return false;
        }
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
     * Sets up file system monitoring for browser changes
     * @private
     */
    _setupFileMonitor() {
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
     * Handles browser configuration file changes with debounce
     * @private
     */
    _onBrowserConfigChanged() {
        // Debounce: file monitors can fire multiple events for a single change
        if (this._debounceTimeoutId) {
            GLib.source_remove(this._debounceTimeoutId);
            this._debounceTimeoutId = null;
        }

        this._debounceTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 250, () => {
            this._debounceTimeoutId = null;

            const previousDefault = this._currentDefault;
            this.getCurrentDefaultBrowser().then(newDefault => {
                if (newDefault && newDefault !== previousDefault) {
                    this._currentDefault = newDefault;
                    this._notifyChange(newDefault);
                }
            }).catch(e => {
                console.error(`Browser Switcher: Error checking browser change: ${e.message}`);
            });

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
