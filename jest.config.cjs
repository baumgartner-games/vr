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
 *
 * **Zwei Geschwindigkeiten.** Ein paar Suiten spielen ganze Runden aus —
 * Bot-Runden über die echte 2D-Runde, das Training der Gewichte, Schächte,
 * Glättung von Wegen —, und die kosten zusammen mehrere Minuten (`SLOW`).
 * `npm test` lässt sie aus, damit die vier Prüfungen vor jedem Push in
 * Sekunden durch sind; `npm run test:slow` fährt genau diese Suiten, und die
 * CI tut beides, in getrennten Jobs. Wer an Runde, Bots oder Wegsuche
 * arbeitet, lässt die langsamen selbst laufen, bevor er pusht.
 */
const SLOW = [
  'worlds/haunting/rules/botRound.test.ts',
  'worlds/haunting/map/flatRound.test.ts',
  'worlds/haunting/vents/flatVents.test.ts',
  'worlds/haunting/navmesh/stationSmoothing.test.ts',
  'worlds/haunting/botTraining.test.ts',
  'worlds/haunting/navmesh/flatWalk.test.ts',
  'worlds/haunting/shipArt.test.ts',
  'worlds/navlab/labSim.test.ts',
  'worlds/haunting/missionBot.test.ts',
  // Die Kisten prüfen hundert Häuser, und jedes davon muss erst gestellt
  // werden (`stationLayout`, gut eine fünftel Sekunde je Haus): rund
  // dreiviertel Minute, die in der schnellen Runde nichts zu suchen hat.
  'worlds/haunting/rules/cargo.test.ts',
];

const slowOnly = process.env.JEST_SLOW === '1';

module.exports = {
  // The suite does not need a system Watchman service; sandboxed macOS runs
  // must not fail before collecting tests because Watchman's socket is private.
  watchman: false,
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  // CSS-Importe gehören zu Vite und nicht zu Jest: Was eine Datei an Stil
  // mitbringt, ist für einen Test nichts (`tools/cssStub.cjs`).
  moduleNameMapper: { '\\.css$': '<rootDir>/tools/cssStub.cjs' },
  testMatch: slowOnly ? SLOW.map((file) => `<rootDir>/src/${file}`) : ['**/*.test.ts'],
  testPathIgnorePatterns: slowOnly ? ['/node_modules/'] : ['/node_modules/', ...SLOW],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      { tsconfig: { module: 'commonjs', target: 'es2022', verbatimModuleSyntax: false } },
    ],
  },
};
