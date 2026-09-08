/**
 * Jest runs the parts of the game that are pure maths — the remote grab above
 * all. Those modules deliberately avoid three.js and Rapier, so the tests need
 * no browser and no WebGL: plain TypeScript compiled to CommonJS.
 *
 * **Vier Ausnahmen gibt es**, und alle vier haben sich verdient:
 * `navlab/labPhysics.test.ts` startet Rapier wirklich (die wasm steckt im
 * compat-Build) und lässt einen NPC über die Quader des Navigationslabors
 * laufen — der Grund steht in der Datei: ein Fehler, den kein nachgebauter
 * Körper zeigt, weil er in der Engine steckt; `npc/npcDirector.test.ts`
 * prüft, woher Nachschub kommt, und dafür braucht ein NPC einen Körper;
 * `physics/playerFooting.test.ts` stellt den Spieler selbst auf den Boden,
 * bei fünf Bildraten, weil die Bildrate mitentschied, ob er hindurchfiel; und
 * `worlds/portal/portalFall.test.ts` lässt einen Zombie und einen Würfel durch
 * ein Bodenportal fallen, denn ob ein Körper durch einen Boden fällt,
 * entscheidet keine Rechnung, sondern eine Kollisionsmaske in der Engine.
 * Alle vier kosten zusammen ein paar Sekunden; alles andere bleibt reine
 * Rechnung.
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
