// SPDX-License-Identifier: GPL-3.0-or-later
// Automation script for gnome-shell-test-tool (GNOME Shell 50+).
// Run through tests/run-tests.sh.

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';
import { ExtensionState } from 'resource:///org/gnome/shell/misc/extensionUtils.js';

const UUID = 'browser-switcher@totoshko88.github.io';
const ROLE = 'browser-switcher-indicator';

export const METRICS = {};

function check(condition, message) {
    if (!condition)
        throw new Error(`FAIL: ${message}`);
    print(`PASS: ${message}`);
}

function checkedItems(indicator) {
    return indicator.menu._getMenuItems().filter(i => i._ornament === PopupMenu.Ornament.CHECK);
}

export async function run() {
    await Scripting.waitLeisure();

    const extension = Main.extensionManager.lookup(UUID);
    check(extension, 'extension is installed');
    check(extension.state === ExtensionState.ACTIVE,
        `extension is active (state ${extension.state}${extension.error ? `, ${extension.error}` : ''})`);

    let indicator = Main.panel.statusArea[ROLE];
    check(indicator, 'indicator is in the panel');

    indicator.menu.open();
    await Scripting.sleep(300);
    const items = indicator.menu._getMenuItems();
    print(`Menu items: ${items.map(i => i.label.text).join(', ')}`);
    check(items.length > 0, 'menu lists at least one entry');
    check(checkedItems(indicator).length <= 1, 'at most one entry is checked');

    const names = items.map(i => i.label.text);
    check(names.every((name, i) => i === 0 || names[i - 1].localeCompare(name) <= 0), 'entries are sorted by name');

    const unchecked = items.find(i => i.reactive && i._ornament !== PopupMenu.Ornament.CHECK);
    if (unchecked) {
        const target = unchecked.label.text;
        unchecked.activate(null);
        // Let the mimeapps.list monitor and its debounce run
        await Scripting.sleep(1000);
        const checked = checkedItems(indicator);
        check(checked.length === 1 && checked[0].label.text === target, `switching to ${target} moves the checkmark`);
        check(indicator.menu._getMenuItems()[0] === items[0], 'menu is not rebuilt by a switch');
    }
    indicator.menu.close();

    for (let cycle = 1; cycle <= 2; cycle++) {
        Main.extensionManager.disableExtension(UUID);
        await Scripting.sleep(500);
        check(extension.state === ExtensionState.INACTIVE, `cycle ${cycle}: disabled`);
        check(!Main.panel.statusArea[ROLE], `cycle ${cycle}: indicator removed`);

        Main.extensionManager.enableExtension(UUID);
        await Scripting.sleep(500);
        check(extension.state === ExtensionState.ACTIVE, `cycle ${cycle}: enabled again`);
        indicator = Main.panel.statusArea[ROLE];
        check(indicator, `cycle ${cycle}: indicator is back`);
    }
}
