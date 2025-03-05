module.exports = {
    // The test environment that will be used for testing
    testEnvironment: 'jsdom',

    // The glob patterns Jest uses to detect test files
    testMatch: [
        '**/test/**/*.test.js'
    ],

    // An array of regexp pattern strings that are matched against all test paths
    // matched tests are skipped
    testPathIgnorePatterns: [
        '/node_modules/'
    ],

    // A map from regular expressions to paths to transformers
    transform: {
        '^.+\\.jsx?$': 'babel-jest'
    },

    // Indicates whether each individual test should be reported during the run
    verbose: true,

    // Automatically clear mock calls and instances between every test
    clearMocks: true,

    // Collect coverage information
    collectCoverage: true,

    // The directory where Jest should output its coverage files
    coverageDirectory: 'coverage',

    // Specify coverage collection
    collectCoverageFrom: [
        'src/**/*.js',
        '!**/node_modules/**',
        '!**/vendor/**'
    ],

    // Coverage thresholds
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },

    // Setup files to run before the tests
    setupFilesAfterEnv: ['<rootDir>/test/setup.js']
}; 