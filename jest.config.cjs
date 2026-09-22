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
  'worlds/haunting/rules/monsterStuck.test.ts',
  'worlds/haunting/map/flatRound.test.ts',
  'worlds/haunting/vents/flatVents.test.ts',
  'worlds/haunting/navmesh/stationSmoothing.test.ts',
  'worlds/haunting/botTraining.test.ts',
  'worlds/haunting/navmesh/flatWalk.test.ts',
  'worlds/haunting/shipArt.test.ts',
  // Die Kisten prüfen hundert Häuser, und jedes davon muss erst gestellt
  // werden (`stationLayout`, gut eine fünftel Sekunde je Haus): rund
  // dreiviertel Minute, die in der schnellen Runde nichts zu suchen hat.
  'worlds/haunting/rules/cargo.test.ts',
  // **Nachgemessen, nicht geschätzt.** Die schnelle Suite war auf acht Minuten
  // gewachsen, ohne dass jemand eine Suite dazu eingeladen hätte: Diese fünf
  // stellen ganze Schiffe, Häuser und Navigationsnetze und kosten je zehn bis
  // dreißig Sekunden — zusammen gut anderthalb Minuten. Damit reißen sie die
  // Zehn-Sekunden-Grenze, die dieses Kapitel selbst aufstellt, und gehen
  // denselben Weg wie die Rundensimulationen: in den Nebenjob, wo niemand
  // darauf wartet.
  'worlds/haunting/ShipExperience.test.ts',
  'worlds/haunting/navmesh/flatNavigation.test.ts',
  'worlds/haunting/haunt.test.ts',
  'worlds/haunting/stationLayout.test.ts',
  'worlds/haunting/roundSim.test.ts',
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
