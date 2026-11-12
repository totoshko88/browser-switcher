// SPDX-License-Identifier: GPL-3.0-or-later
// Menu builder for Gnome Browser Switcher

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

/**
 * Fills the indicator menu with the detected browsers and marks the default.
 */
export class MenuBuilder {
    constructor(menu, browserManager) {
        this._menu = menu;
        this._browserManager = browserManager;
        this._items = new Map();

        this._browserManager.connectObject(
            'browsers-changed', () => this._rebuild(),
            'default-changed', () => this._updateOrnaments(),
            this);

        this._rebuild();
    }

    destroy() {
        this._browserManager.disconnectObject(this);
        this._clearItems();
        this._menu = null;
        this._browserManager = null;
    }

    _clearItems() {
        for (const item of this._items.values())
            item.disconnectObject(this);
        this._items.clear();
    }

    _rebuild() {
        this._clearItems();
        this._menu.removeAll();

        const browsers = this._browserManager.browsers;
        if (browsers.length === 0) {
            this._menu.addMenuItem(new PopupMenu.PopupMenuItem('No browsers found', {
                reactive: false,
                can_focus: false,
            }));
            return;
        }

        for (const browser of browsers) {
            const item = new PopupMenu.PopupImageMenuItem(browser.name, browser.gicon ?? 'web-browser');
            item.connectObject('activate', () => this._selectBrowser(browser.id), this);
            this._menu.addMenuItem(item);
            this._items.set(browser.id, item);
        }

        this._updateOrnaments();
    }

    _updateOrnaments() {
        const defaultId = this._browserManager.defaultBrowserId;
        for (const [id, item] of this._items)
            item.setOrnament(id === defaultId ? PopupMenu.Ornament.CHECK : PopupMenu.Ornament.NONE);
    }

    _selectBrowser(browserId) {
        if (!this._browserManager.setDefaultBrowser(browserId))
            Main.notify('Browser Switcher', 'Could not change the default browser.');
    }
}
