// SPDX-License-Identifier: GPL-3.0-or-later
// System panel indicator for Gnome Browser Switcher

import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

const FALLBACK_ICON_NAME = 'web-browser-symbolic';
const DESATURATE_EFFECT_NAME = 'browser-switcher-desaturate';

/**
 * Panel button showing the icon of the current default browser.
 */
export const BrowserIndicator = GObject.registerClass(class BrowserIndicator extends PanelMenu.Button {
    constructor(browserManager, settings) {
        super(0.0, 'Browser Switcher Indicator');

        this._browserManager = browserManager;
        this._settings = settings;

        this._icon = new St.Icon({
            icon_name: FALLBACK_ICON_NAME,
            style_class: 'system-status-icon',
        });
        this.add_child(this._icon);

        this._settings.connectObject(
            'changed::desaturate-panel-icon', () => this._updateDesaturation(),
            this);
        this._browserManager.connectObject(
            'browsers-changed', () => this._updateIcon(),
            'default-changed', () => this._updateIcon(),
            this);

        this._updateDesaturation();
        this._updateIcon();
    }

    destroy() {
        this._settings.disconnectObject(this);
        this._browserManager.disconnectObject(this);
        this._settings = null;
        this._browserManager = null;
        super.destroy();
    }

    _updateDesaturation() {
        // The effect is applied to the panel icon only; menu icons keep their colors
        this._icon.remove_effect_by_name(DESATURATE_EFFECT_NAME);
        if (this._settings.get_boolean('desaturate-panel-icon'))
            this._icon.add_effect_with_name(DESATURATE_EFFECT_NAME, new Clutter.DesaturateEffect());
    }

    _updateIcon() {
        const gicon = this._browserManager.defaultBrowser?.gicon;
        if (gicon)
            this._icon.gicon = gicon;
        else
            this._icon.icon_name = FALLBACK_ICON_NAME;
    }
});
