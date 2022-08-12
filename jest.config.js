// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

module.exports = {
  preset: 'ts-jest/presets/js-with-babel',
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  globals: {
  },
  roots: [
    "<rootDir>/__tests__"
  ],
  testEnvironment: "node",
  testPathIgnorePatterns: [
    "support/",
    "setupTests\.js",
    "/node_modules/",
    "utils\.js",
    "utils/index\.ts",
    "mocks\.js",
    ".*\.base\.js",
    "/src/"
  ],
  transform: {
  },
};
