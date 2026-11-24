import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['dist/', 'build/', 'coverage/', 'node_modules/'],
    },
    ...tseslint.configs.recommended,
    {
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-console': 'warn',
        },
    },
    {
        // Node scripts and CommonJS config: build config, Jest module mocks, the browser smoke test.
        files: ['*.js', 'e2e/**/*.js', 'src/__tests__/__mocks__/**/*.js'],
        languageOptions: {
            sourceType: 'commonjs',
            globals: {
                require: 'readonly', module: 'writable', __dirname: 'readonly', process: 'readonly',
                console: 'readonly', setTimeout: 'readonly', Buffer: 'readonly',
            },
        },
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
            'no-console': 'off',
        },
    }
);
