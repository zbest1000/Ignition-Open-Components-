module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts'],
    moduleFileExtensions: ['ts', 'tsx', 'js'],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }]
    },
    moduleNameMapper: {
        '\\.(css|scss)$': '<rootDir>/src/__tests__/__mocks__/styleMock.js',
        '^@inductiveautomation/perspective-client$': '<rootDir>/src/__tests__/__mocks__/perspectiveClient.js',
        '^echarts/core$': '<rootDir>/src/__tests__/__mocks__/echarts.js',
        '^echarts/charts$': '<rootDir>/src/__tests__/__mocks__/echarts.js',
        '^echarts/components$': '<rootDir>/src/__tests__/__mocks__/echarts.js',
        '^echarts/renderers$': '<rootDir>/src/__tests__/__mocks__/echarts.js',
        '^echarts-gl$': '<rootDir>/src/__tests__/__mocks__/echarts.js'
    }
};
