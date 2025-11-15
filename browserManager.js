// SPDX-License-Identifier: GPL-3.0-or-later
// Browser detection and management for Gnome Browser Switcher

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

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
        
        // Initialize browser list
        this._detectBrowsers();
    }

    /**
     * Scans standard XDG directories for .desktop files and detects browsers
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
        
        // Standard XDG directories to scan
        const searchPaths = [
            '/usr/share/applications',
            '/usr/local/share/applications',
            GLib.build_filenamev([GLib.get_home_dir(), '.local/share/applications'])
        ];

        for (const path of searchPaths) {
            this._scanDirectory(path);
        }
        
        console.log(`Browser Switcher: Found ${this._browsers.length} browsers`);
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
        } catch (e) {
            // Directory doesn't exist or can't be read - this is normal
            // log(`Browser Switcher: Could not scan ${dirPath}: ${e.message}`);
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
            
            // Check if this is a web browser
            const categories = keyFile.get_string('Desktop Entry', 'Categories');
            if (!categories || !categories.includes('WebBrowser')) {
                return;
            }
            
            // Extract browser information
            const name = keyFile.get_string('Desktop Entry', 'Name');
            const exec = keyFile.get_string('Desktop Entry', 'Exec');
            let icon = 'web-browser'; // Default fallback
            
            try {
                icon = keyFile.get_string('Desktop Entry', 'Icon');
            } catch (e) {
                // Icon field is optional
            }
            
            // Create browser object
            const browser = {
                id: fileName,
                name: name,
                icon: icon,
                execPath: exec.split(' ')[0], // Get just the executable path
                desktopFile: filePath
            };
            
            // Check for duplicates - avoid adding the same browser twice
            // Check by both ID and executable path to catch different .desktop files for the same browser
            const existingBrowser = this._browsers.find(b => 
                b.id === browser.id || b.execPath === browser.execPath
            );
            if (!existingBrowser) {
                this._browsers.push(browser);
                console.log(`Browser Switcher: Added browser: ${browser.name} (${browser.id}) - ${browser.execPath}`);
            } else {
                console.log(`Browser Switcher: Skipped duplicate: ${browser.name} (${browser.id}) - already have ${existingBrowser.id}`);
            }
            
        } catch (e) {
            // Failed to parse desktop file - skip it
            console.error(`Browser Switcher: Could not parse ${filePath}: ${e.message}`);
        }
    }

    /**
     * Gets the current default browser synchronously
     * Note: This is called during initialization and needs to be sync
     * @returns {string|null} Browser ID (desktop file name) or null if not found
     */
    getCurrentDefaultBrowser() {
        // Try xdg-settings using command line
        try {
            const [success, stdout] = GLib.spawn_command_line_sync('xdg-settings get default-web-browser');
            
            if (success) {
                const browserId = new TextDecoder().decode(stdout).trim();
                if (browserId) {
                    this._currentDefault = browserId;
                    return browserId;
                }
            }
        } catch (e) {
            console.error(`Browser Switcher: xdg-settings failed: ${e.message}`);
        }
        
        // Fallback to GSettings
        try {
            const settings = new Gio.Settings({
                schema_id: 'org.gnome.desktop.default-applications.web'
            });
            
            const browserId = settings.get_string('browser');
            if (browserId) {
                this._currentDefault = browserId;
                return browserId;
            }
        } catch (e) {
            console.error(`Browser Switcher: GSettings fallback failed: ${e.message}`);
        }
        
        return null;
    }

    /**
     * Sets the default browser asynchronously
     * @param {string} browserId - Browser ID (desktop file name)
     */
    async setDefaultBrowser(browserId) {
        if (!browserId) {
            console.error('Browser Switcher: Invalid browser ID');
            return;
        }
        
        try {
            // Use async subprocess
            const proc = Gio.Subprocess.new(
                ['xdg-settings', 'set', 'default-web-browser', browserId],
                Gio.SubprocessFlags.NONE
            );
            
            const success = await proc.wait_check_async(null);
            
            if (success) {
                console.log(`Browser Switcher: Set default browser to ${browserId}`);
                this._currentDefault = browserId;
                this._notifyChange(browserId);
                return;
            }
        } catch (e) {
            console.error(`Browser Switcher: Failed to set default browser: ${e.message}`);
        }
    }

    /**
     * Watches for changes to the default browser
     * @param {Function} callback - Callback function to call when browser changes
     */
    watchDefaultBrowser(callback) {
        if (callback && typeof callback === 'function') {
            this._changeCallbacks.push(callback);
        }
        
        // Set up file system monitoring if not already done
        if (!this._fileMonitor) {
            this._setupFileMonitor();
        }
    }

    /**
     * Sets up file system monitoring for browser changes
     * @private
     */
    _setupFileMonitor() {
        // Monitor the mimeapps.list file which xdg-settings modifies
        const configPath = GLib.build_filenamev([
            GLib.get_user_config_dir(),
            'mimeapps.list'
        ]);
        
        const file = Gio.File.new_for_path(configPath);
        
        try {
            this._fileMonitor = file.monitor_file(Gio.FileMonitorFlags.NONE, null);
            this._fileMonitor.connect('changed', () => {
                this._onBrowserConfigChanged();
            });
            
            console.log('Browser Switcher: File monitor set up successfully');
        } catch (e) {
            console.error(`Browser Switcher: Could not set up file monitor: ${e.message}`);
        }
    }

    /**
     * Handles browser configuration file changes
     * @private
     */
    _onBrowserConfigChanged() {
        const newDefault = this.getCurrentDefaultBrowser();
        
        if (newDefault && newDefault !== this._currentDefault) {
            console.log(`Browser Switcher: Browser changed from ${this._currentDefault} to ${newDefault}`);
            this._currentDefault = newDefault;
            this._notifyChange(newDefault);
        }
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
        if (this._fileMonitor) {
            this._fileMonitor.cancel();
            this._fileMonitor = null;
        }
        
        this._changeCallbacks = [];
        this._browsers = [];
        this._currentDefault = null;
    }
}

export { BrowserManager };
