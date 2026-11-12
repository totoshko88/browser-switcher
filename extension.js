// SPDX-License-Identifier: GPL-3.0-or-later
// Gnome Browser Switcher Extension Entry Point

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import { BrowserManager } from './browserManager.js';
import { BrowserIndicator } from './indicator.js';
import { MenuBuilder } from './menuBuilder.js';

export default class BrowserSwitcherExtension extends Extension {
    enable() {
        this._browserManager = new BrowserManager();
        this._browserManager.start();

        this._indicator = new BrowserIndicator(this._browserManager, this.getSettings());
        this._menuBuilder = new MenuBuilder(this._indicator.menu, this._browserManager);
        Main.panel.addToStatusArea('browser-switcher-indicator', this._indicator);
    }

    disable() {
        this._menuBuilder?.destroy();
        this._menuBuilder = null;

        this._indicator?.destroy();
        this._indicator = null;

        this._browserManager?.destroy();
        this._browserManager = null;
    }
}
