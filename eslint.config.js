// SPDX-License-Identifier: GPL-3.0-or-later
// ESLint flat config (ESLint 9+). No plugins needed: run with `npx eslint@10 .`

const gjsGlobals = {
    console: 'readonly',
    global: 'readonly',
    globalThis: 'readonly',
    log: 'readonly',
    logError: 'readonly',
    print: 'readonly',
    printerr: 'readonly',
    TextDecoder: 'readonly',
    TextEncoder: 'readonly',
};

export default [
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: gjsGlobals,
        },
        rules: {
            'no-undef': 'error',
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'no-unreachable': 'error',
            'no-dupe-keys': 'error',
            'no-dupe-class-members': 'error',
            'no-const-assign': 'error',
            'prefer-const': 'warn',
            'no-var': 'error',
            'eqeqeq': ['error', 'always', { null: 'ignore' }],
            'semi': ['warn', 'always'],
            'quotes': ['warn', 'single', { avoidEscape: true }],
            'indent': ['warn', 4, { SwitchCase: 1 }],
            'no-trailing-spaces': 'warn',
            'eol-last': 'warn',
            'no-multiple-empty-lines': ['warn', { max: 1 }],
            'max-len': ['warn', { code: 120, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true }],
        },
    },
];
