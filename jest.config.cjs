/**
 * Jest runs the parts of the game that are pure maths — the remote grab above
 * all. Those modules deliberately avoid three.js and Rapier, so the tests need
 * no browser and no WebGL: plain TypeScript compiled to CommonJS.
 *
 * **Eine Ausnahme gibt es**, und sie hat sich verdient: `navlab/labPhysics.test.ts`
 * startet Rapier wirklich (die wasm steckt im compat-Build) und lässt einen NPC
 * über die Quader des Navigationslabors laufen. Der Grund steht in der Datei —
 * ein Fehler, den kein nachgebauter Körper zeigt, weil er in der Engine steckt.
 * Er kostet eine Sekunde; alles andere bleibt reine Rechnung.
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
