// SPDX-License-Identifier: GPL-3.0-or-later
// Preferences dialog for Gnome Browser Switcher

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class BrowserSwitcherPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const page = new Adw.PreferencesPage();
        const group = new Adw.PreferencesGroup({
            title: 'Panel Icon',
            description: 'Choose how the browser icon appears in the system panel.',
        });
        const desaturationRow = new Adw.SwitchRow({
            title: 'Desaturate panel icon',
            subtitle: 'Show the panel icon without color.',
        });

        this.getSettings().bind(
            'desaturate-panel-icon',
            desaturationRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );

        group.add(desaturationRow);
        page.add(group);
        window.add(page);
    }
}
