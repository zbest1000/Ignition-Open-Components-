import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['dist/', 'build/', 'node_modules/', 'webpack.config.js', 'jest.config.js', 'src/__tests__/'],
    },
    ...tseslint.configs.recommended,
    {
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-console': 'warn',
        },
    }
);
