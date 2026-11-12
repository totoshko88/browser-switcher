// SPDX-License-Identifier: GPL-3.0-or-later
// Checks BrowserManager against the real application database.
// Run through tests/run-tests.sh, which points XDG_CONFIG_HOME at a copy of
// mimeapps.list so the user's default browser is never changed.

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import System from 'system';

import { BrowserManager } from '../browserManager.js';

const WEB_TYPES = ['x-scheme-handler/http', 'x-scheme-handler/https', 'text/html', 'application/xhtml+xml'];

let failures = 0;
function check(condition, message) {
    print(`${condition ? 'PASS' : 'FAIL'}: ${message}`);
    if (!condition)
        failures++;
}

if (!GLib.getenv('XDG_CONFIG_HOME')?.startsWith(GLib.get_tmp_dir())) {
    printerr('Refusing to run: XDG_CONFIG_HOME must point to a temporary directory');
    System.exit(2);
}

const manager = new BrowserManager();
let defaultChangedCount = 0;
manager.connect('default-changed', () => defaultChangedCount++);
manager._refresh();

const systemDefault = Gio.AppInfo.get_default_for_type('x-scheme-handler/http', false);
print(`System default: ${systemDefault?.get_id() ?? 'none'}`);
print(`Browsers: ${manager.browsers.map(b => b.id).join(', ')}`);

check(manager.browsers.length > 0, 'at least one browser detected');
check(new Set(manager.browsers.map(b => b.id)).size === manager.browsers.length, 'no duplicate IDs');
const visibleNames = manager.browsers.filter(b => b.appInfo.should_show()).map(b => b.name);
check(new Set(visibleNames).size === visibleNames.length, 'no duplicate names among visible browsers');

if (systemDefault) {
    check(manager.defaultBrowserId === systemDefault.get_id(), 'default ID matches the system default');
    check(manager.defaultBrowser !== null, 'default browser is present in the list');
}

for (const browser of manager.browsers) {
    if (browser.id === manager.defaultBrowserId)
        continue;
    const categories = browser.appInfo.get_categories();
    check(!categories || categories.split(';').includes('WebBrowser'),
        `${browser.id} is a web browser (Categories=${categories})`);
}

check(manager.setDefaultBrowser('no-such-browser.desktop') === false, 'unknown browser is rejected');

const target = manager.browsers.find(b => b.id !== manager.defaultBrowserId && b.appInfo.should_show());
if (target) {
    defaultChangedCount = 0;
    check(manager.setDefaultBrowser(target.id), `switched to ${target.id}`);
    check(defaultChangedCount === 1, 'default-changed emitted once');
    check(manager.defaultBrowserId === target.id, 'cached default updated');

    const supported = target.appInfo.get_supported_types();
    for (const type of WEB_TYPES) {
        if (type !== 'x-scheme-handler/http' && !supported.includes(type))
            continue;
        const handler = Gio.AppInfo.get_default_for_type(type, false);
        check(handler?.get_id() === target.id, `${type} handled by ${target.id}`);
    }

    defaultChangedCount = 0;
    manager._refresh();
    check(manager.defaultBrowserId === target.id, 'default survives a refresh');
    check(defaultChangedCount === 0, 'refresh without changes emits nothing');
    if (systemDefault && !systemDefault.should_show())
        check(!manager.browsers.some(b => b.id === systemDefault.get_id()), 'previous hidden default dropped from the list');
} else {
    print('SKIP: only one browser installed, switching not tested');
}

manager.destroy();
print(failures === 0 ? 'All checks passed' : `${failures} check(s) failed`);
System.exit(failures === 0 ? 0 : 1);
