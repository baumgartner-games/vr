/**
 * Jest runs the parts of the game that are pure maths — the remote grab above
 * all. Those modules deliberately avoid three.js and Rapier, so the tests need
 * no browser, no WebGL and no wasm: plain TypeScript compiled to CommonJS.
 */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      { tsconfig: { module: 'commonjs', target: 'es2022', verbatimModuleSyntax: false } },
    ],
  },
};
