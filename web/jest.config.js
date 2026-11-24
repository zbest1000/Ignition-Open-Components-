module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }]
    },
    moduleNameMapper: {
        '\\.(css|scss)$': '<rootDir>/src/__tests__/__mocks__/styleMock.js',
        '^@inductiveautomation/perspective-client$': '<rootDir>/src/__tests__/__mocks__/perspectiveClient.js',
        '^echarts/(core|charts|components|renderers)$': '<rootDir>/src/__tests__/__mocks__/echarts.js',
        '^echarts-gl$': '<rootDir>/src/__tests__/__mocks__/echartsGl.js'
    },
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/__tests__/**'
    ],
    // A little under what the suite reaches, so a real drop fails the build.
    coverageThreshold: {
        global: { statements: 95, branches: 90, functions: 90, lines: 95 }
    }
};
