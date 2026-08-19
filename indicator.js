// SPDX-License-Identifier: GPL-3.0-or-later
// System panel indicator for Gnome Browser Switcher

import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

/**
 * BrowserIndicator displays the current browser icon in the system panel
 * and provides access to the browser switching menu.
 */
const BrowserIndicator = GObject.registerClass(
    class BrowserIndicator extends PanelMenu.Button {
        _init(browserManager, settings) {
            super._init(0.0, 'Browser Switcher Indicator');

            this._browserManager = browserManager;
            this._settings = settings;

            this._icon = new St.Icon({
                icon_name: 'web-browser-symbolic',
                style_class: 'system-status-icon',
            });
            this._desaturationEffect = new Clutter.DesaturateEffect({ factor: 1.0 });
            this.add_child(this._icon);

            this._updateDesaturation();
            this._settings.connectObject(
                'changed::desaturate-panel-icon',
                () => this._updateDesaturation(),
                this
            );

            this._browserManager.watchDefaultBrowser((browserId) => {
                this.updateIcon(browserId);
            });

            // Icon will be updated once browserManager.initialize() resolves
            const currentBrowser = this._browserManager.getCachedDefaultBrowser();
            if (currentBrowser)
                this.updateIcon(currentBrowser);
        }

        /**
         * Applies the configured visual treatment to the panel icon only.
         * @private
         */
        _updateDesaturation() {
            if (this._settings.get_boolean('desaturate-panel-icon')) {
                this._icon.add_effect_with_name(
                    'browser-switcher-desaturation',
                    this._desaturationEffect
                );
            } else {
                this._icon.remove_effect_by_name('browser-switcher-desaturation');
            }
        }

        /**
         * Updates the indicator icon to match the specified browser
         * @param {string} browserId - Browser ID (desktop file name)
         */
        updateIcon(browserId) {
            const browser = browserId
                ? this._browserManager.getInstalledBrowsers().find(b => b.id === browserId)
                : null;

            if (browser?.gicon) {
                this._icon.gicon = browser.gicon;
            } else {
                this._icon.gicon = null;
                this._icon.icon_name = 'web-browser-symbolic';
            }
        }

        show() {
            this.visible = true;
        }

        hide() {
            this.visible = false;
        }

        destroy() {
            this._settings.disconnectObject(this);
            this._desaturationEffect = null;
            this._icon = null;
            this._settings = null;
            this._browserManager = null;
            super.destroy();
        }
    });

export { BrowserIndicator };
