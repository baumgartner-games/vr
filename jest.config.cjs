/**
 * Jest runs the parts of the game that are pure maths — the remote grab above
 * all. Those modules deliberately avoid three.js and Rapier, so the tests need
 * no browser and no WebGL: plain TypeScript compiled to CommonJS.
 *
 * **Drei Ausnahmen gibt es**, und alle drei haben sich verdient:
 * `npc/npcDirector.test.ts` prüft, woher Nachschub kommt, und dafür braucht
 * ein NPC einen Körper; `physics/playerFooting.test.ts` stellt den Spieler
 * selbst auf den Boden, bei fünf Bildraten, weil die Bildrate mitentschied, ob
 * er hindurchfiel; und `worlds/portal/portalFall.test.ts` lässt einen Zombie
 * und einen Würfel durch ein Bodenportal fallen, denn ob ein Körper durch
 * einen Boden fällt, entscheidet keine Rechnung, sondern eine Kollisionsmaske
 * in der Engine. Alle drei kosten zusammen ein paar Sekunden; alles andere
 * bleibt reine Rechnung.
 *
 * (Die vierte war `navlab/labPhysics.test.ts` — sie lief über die Quader des
 * Navigationslabors und ist mit dieser Welt gegangen.)
 *
 * **Eine Geschwindigkeit.** Hier standen einmal zwei: eine Liste `SLOW` mit
 * vierzehn Suiten, die ganze Runden ausspielten (Bot-Runden, das Training der
 * Gewichte, Schächte, Glättung), ein zweites Skript `test:slow` und ein
 * zweiter CI-Job daneben. Zusammen kosteten sie über acht Minuten Rechenzeit
 * für 214 Tests — und damit mehr als die 4776 Tests dieser Suite, die in gut
 * einer halben Minute durch sind. Sie sind weg (`docs/agents/tests.md`): Was
 * hier läuft, läuft in einem Lauf, und `npm test` ist alles, was es gibt.
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
