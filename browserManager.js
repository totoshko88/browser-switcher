// SPDX-License-Identifier: GPL-3.0-or-later
// Browser detection and default browser management for Gnome Browser Switcher

import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const WEB_CONTENT_TYPE = 'x-scheme-handler/http';

// GNOME Settings assigns these together with the web handler, but only the
// ones the chosen application declares in its MimeType key.
const SECONDARY_CONTENT_TYPES = [
    'x-scheme-handler/https',
    'text/html',
    'application/xhtml+xml',
];

const CHANGE_DEBOUNCE_MS = 250;

/**
 * Applications without a Categories key are kept, so hand-written
 * .desktop files (e.g. a browser profile launcher) still show up.
 *
 * @param {Gio.DesktopAppInfo} appInfo
 * @returns {boolean}
 */
function isWebBrowser(appInfo) {
    const categories = appInfo.get_categories();
    return !categories || categories.split(';').includes('WebBrowser');
}

function toBrowser(appInfo) {
    return {
        id: appInfo.get_id(),
        name: appInfo.get_display_name(),
        gicon: appInfo.get_icon(),
        appInfo,
    };
}

/**
 * Detects installed browsers through Gio.AppInfo and changes the default
 * web handler. Emits `browsers-changed` when the list of browsers changes
 * and `default-changed` when the default browser changes.
 */
export const BrowserManager = GObject.registerClass({
    Signals: {
        'browsers-changed': {},
        'default-changed': {},
    },
}, class BrowserManager extends GObject.Object {
    constructor() {
        super();

        this._browsers = [];
        this._defaultBrowserId = null;
        this._debounceSourceId = 0;
        this._appInfoMonitor = null;
        this._mimeappsMonitor = null;
    }

    /**
     * Detects browsers and starts watching the application database and
     * the user's mimeapps.list for changes made outside the extension.
     */
    start() {
        this._detect();

        this._appInfoMonitor = Gio.AppInfoMonitor.get();
        this._appInfoMonitor.connectObject(
            'changed', () => this._scheduleRefresh(), this);

        const mimeappsFile = Gio.File.new_for_path(GLib.build_filenamev([
            GLib.get_user_config_dir(),
            'mimeapps.list',
        ]));
        try {
            this._mimeappsMonitor = mimeappsFile.monitor_file(Gio.FileMonitorFlags.NONE, null);
            this._mimeappsMonitor.connectObject(
                'changed', () => this._scheduleRefresh(), this);
        } catch (e) {
            console.error(`Browser Switcher: Could not monitor mimeapps.list: ${e.message}`);
        }
    }

    destroy() {
        if (this._debounceSourceId) {
            GLib.Source.remove(this._debounceSourceId);
            this._debounceSourceId = 0;
        }

        this._appInfoMonitor?.disconnectObject(this);
        this._appInfoMonitor = null;

        if (this._mimeappsMonitor) {
            this._mimeappsMonitor.disconnectObject(this);
            this._mimeappsMonitor.cancel();
            this._mimeappsMonitor = null;
        }

        this._browsers = [];
        this._defaultBrowserId = null;
    }

    /** @returns {Array<{id: string, name: string, gicon: ?Gio.Icon, appInfo: Gio.AppInfo}>} */
    get browsers() {
        return this._browsers;
    }

    /** @returns {?string} desktop file ID of the default browser */
    get defaultBrowserId() {
        return this._defaultBrowserId;
    }

    /** @returns {?object} entry of `browsers` for the default browser */
    get defaultBrowser() {
        return this._browsers.find(b => b.id === this._defaultBrowserId) ?? null;
    }

    /**
     * Re-reads the application database and emits signals for whatever
     * changed. Querying the database also re-arms Gio.AppInfoMonitor,
     * which emits `changed` only once until the next query.
     */
    _refresh() {
        const previousIds = this._browsers.map(b => b.id).join(';');
        const previousDefaultId = this._defaultBrowserId;

        this._detect();

        if (this._browsers.map(b => b.id).join(';') !== previousIds)
            this.emit('browsers-changed');
        if (this._defaultBrowserId !== previousDefaultId)
            this.emit('default-changed');
    }

    /**
     * Makes the browser the default handler for web links and pages.
     *
     * @param {string} browserId - desktop file ID
     * @returns {boolean} whether the default was changed
     */
    setDefaultBrowser(browserId) {
        const browser = this._browsers.find(b => b.id === browserId);
        if (!browser) {
            console.error(`Browser Switcher: Unknown browser ID: ${browserId}`);
            return false;
        }

        const supportedTypes = browser.appInfo.get_supported_types();
        try {
            browser.appInfo.set_as_default_for_type(WEB_CONTENT_TYPE);
            for (const contentType of SECONDARY_CONTENT_TYPES) {
                if (supportedTypes.includes(contentType))
                    browser.appInfo.set_as_default_for_type(contentType);
            }
        } catch (e) {
            console.error(`Browser Switcher: Failed to set default browser: ${e.message}`);
            return false;
        }

        // The mimeapps.list monitor fires shortly after and refreshes the
        // list, which also drops a previously shown hidden default.
        if (this._defaultBrowserId !== browserId) {
            this._defaultBrowserId = browserId;
            this.emit('default-changed');
        }
        return true;
    }

    _scheduleRefresh() {
        // Monitors emit several events for a single change
        if (this._debounceSourceId)
            GLib.Source.remove(this._debounceSourceId);
        this._debounceSourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, CHANGE_DEBOUNCE_MS, () => {
            this._debounceSourceId = 0;
            this._refresh();
            return GLib.SOURCE_REMOVE;
        });
    }

    _detect() {
        const defaultApp = Gio.AppInfo.get_default_for_type(WEB_CONTENT_TYPE, false);
        const defaultId = defaultApp ? defaultApp.get_id() : null;
        const browsers = [];

        for (const appInfo of Gio.AppInfo.get_all_for_type(WEB_CONTENT_TYPE)) {
            if (!appInfo.should_show() || !isWebBrowser(appInfo))
                continue;

            // The same browser can ship several .desktop files, e.g.
            // google-chrome.desktop and google-chrome-stable.desktop.
            // Keep the one that is the current default.
            const duplicateIndex = browsers.findIndex(b =>
                b.id === appInfo.get_id() || b.name === appInfo.get_display_name());
            if (duplicateIndex === -1)
                browsers.push(toBrowser(appInfo));
            else if (appInfo.get_id() === defaultId)
                browsers[duplicateIndex] = toBrowser(appInfo);
        }

        // The default can be a hidden handler, e.g. the NoDisplay
        // userapp-Firefox-*.desktop that Firefox creates when it makes itself
        // the default. List it so the menu and panel show the real default.
        if (defaultApp && !browsers.some(b => b.id === defaultId))
            browsers.push(toBrowser(defaultApp));

        if (browsers.length === 0)
            console.warn('Browser Switcher: No browsers found');

        // get_all_for_type() puts the default first; a fixed order keeps the
        // menu stable and avoids rebuilding it on every switch.
        browsers.sort((a, b) => a.name.localeCompare(b.name));

        this._browsers = browsers;
        this._defaultBrowserId = defaultId;
    }
});
