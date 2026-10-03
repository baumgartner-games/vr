/**
 * Jest prüft nur, was kritisch ist und im Browser nicht auffällt: Navigation,
 * Greifen, Boden und Portale, Speicherstände, Netz und die App-Hülle — 26
 * Suiten, unter zehn Sekunden (`docs/agents/tests.md`, dort auch die Liste und
 * wo die gelöschten Suiten in der Geschichte liegen). Die Module darunter
 * kommen ohne Renderer und WebGL aus: plain TypeScript, nach CommonJS
 * übersetzt.
 *
 * Zwei Suiten starten wirklich Rapier: `physics/playerFooting.test.ts` stellt
 * den Spieler bei fünf Bildraten auf den Boden, und
 * `worlds/portal/portalFall.test.ts` lässt einen Zombie und einen Würfel durch
 * ein Bodenportal fallen — ob ein Körper durch einen Boden fällt, entscheidet
 * eine Kollisionsmaske in der Engine und keine Rechnung.
 */
module.exports = {
  // The suite does not need a system Watchman service; sandboxed macOS runs
  // must not fail before collecting tests because Watchman's socket is private.
  watchman: false,
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  // CSS-Importe gehören zu Vite und nicht zu Jest: Was eine Datei an Stil
  // mitbringt, ist für einen Test nichts (`tools/cssStub.cjs`).
  moduleNameMapper: { '\\.css$': '<rootDir>/tools/cssStub.cjs' },
  testMatch: ['**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      { tsconfig: { module: 'commonjs', target: 'es2022', verbatimModuleSyntax: false } },
    ],
  },
};
