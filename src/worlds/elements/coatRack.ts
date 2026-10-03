import type { ElementPart, GameElement } from './elementCatalog';

/**
 * **Die Garderobe** — der Ständer, an dem man sein Aussehen ändert.
 *
 * Sie ersetzt den Kleiderschrank der Sandbox (Oktober 2026): _„haben wir einen
 * garderoben ständer als model? das wäre mir lieber als der kleiderschrank um
 * das aussehen menü zu öffnen"_. Einen Garderobenständer hat das Regal nicht,
 * also ist er aus einem einzigen Pfosten gebaut (`dungeon/post.glb`) — Stange,
 * Manschette, vier Füße und acht Haken, jedes Stück derselbe Pfosten auf
 * anderen Maßen (`ElementPart.size`). Daran hängen Stücke, die Figuren tragen
 * (`ElementPart.node`): der Hut der Hexe, der Umhang des Schwarzen Ritters
 * und der Helm des Paladins.
 *
 * **Gebaut nach einem Foto, nicht nach Gefühl.** Die Füße setzen wie bei einem
 * echten Ständer knapp über dem Boden an einer Manschette an und laufen schräg
 * nach außen; oben gibt es je Seite zwei Haken — einen kurzen, fast
 * waagerechten, und darüber einen langen, steilen (nach dem Referenzbild des
 * Besitzers). Alles zusammen bleibt in 2 × 2 Feldern: Kein Hut ragt mehr als
 * 0,49 m aus der Mitte.
 *
 * **Wo die Hüte hängen, hat die Physik gesagt.** Hexenhut und Umhang fielen
 * mit genauen Hitboxen (ihr Dreiecksnetz samt Innenseite) auf die Haken, bis
 * sie stillhingen; die Lagen hier sind das Ergebnis, fest eingetragen, ohne
 * Physik im Spiel. Der Helm ist innen geschlossen modelliert und konnte nicht
 * rutschen — er ist von Hand auf den oberen Haken gesetzt, die Öffnung nach
 * unten, das Visier nach außen; der Umhang hing in der Rechnung am oberen
 * Haken und ist von Hand an den unteren gerückt.
 *
 * Die Hüte haben **nicht** ihre Größe auf dem Kopf: Dort sind sie 0,9 bis
 * 1,1 m breit (der Kopf einer Figur ist 64 cm breit). Gewünscht war die
 * Garderobe auf einer Kachel, also hängen sie halb so groß, der Helm zu zwei
 * Dritteln.
 */

const POST = 'dungeon/post.glb';
const WITCH = 'mystery-monthly-5/5-november-2024-witch/characters/Witch.glb';
const BLACK_KNIGHT = 'mystery-monthly-5/3-september-2024-black-knight/characters/BlackKnight.glb';
const PALADIN = 'mystery-monthly-4/10-april-2024-paladin/characters/Paladin_with_Helmet.glb';

/** Grad in Bogenmaß. */
const deg = (a: number): number => (a * Math.PI) / 180;

/**
 * **Die Streckung von Stange und Füßen** — doppelt so breit und auf 0,8 der
 * Höhe, gemessen an einem Ständer von 1,75 m mit 8 cm dicker Stange: So wird
 * er 1,40 m hoch, mit Füßen, die gut 0,9 m spannen. Die Haken streckt sie
 * nicht, sonst stünden sie flacher und dicker als gewollt.
 */
const STRETCH: readonly [number, number, number] = [2, 0.8, 2];

/** Wo die Haken aus der Stange kommen, in Metern über dem Boden. */
const PEG_Y = 1.1;

/** Die Füße: wie weit sie draußen stehen und wie hoch sie ansetzen (vor `STRETCH`). */
const FOOT_OUT = 0.22;
const FOOT_JOINT = 0.27;
const POLE_HALF = 0.04;

/** Ein Fuß je Diagonale — schräg von der Manschette auf den Boden. */
function foot(i: number): ElementPart {
  const turn = deg(i * 90 + 45);
  const lean = Math.atan2(FOOT_OUT - POLE_HALF, FOOT_JOINT);
  return {
    model: POST,
    size: [0.05, Math.hypot(FOOT_OUT - POLE_HALF, FOOT_JOINT) + 0.02, 0.05],
    pose: {
      at: [Math.sin(turn) * FOOT_OUT, 0, Math.cos(turn) * FOOT_OUT],
      rot: [-lean, turn, 0],
    },
    stretch: STRETCH,
  };
}

/**
 * Zwei Haken je Seite, aus der Mitte der Stange: unten kurz und fast
 * waagerecht (75° aus dem Lot), darüber lang und steil (25° aus dem Lot).
 */
function pegs(i: number): ElementPart[] {
  const turn = deg(i * 90);
  return [
    { model: POST, size: [0.06, 0.25, 0.06], pose: { at: [0, PEG_Y, 0], rot: [deg(75), turn, 0] } },
    {
      model: POST,
      size: [0.06, 0.36, 0.06],
      pose: { at: [0, PEG_Y + 0.03, 0], rot: [deg(25), turn, 0] },
    },
  ];
}

export const COAT_RACK: GameElement = {
  id: 'coat-rack',
  label: 'Garderobe',
  aka: ['Kleiderständer', 'Garderobenständer', 'Kleiderhaken', 'Aussehen', 'Kleidung'],
  tiles: [1, 1],
  height: 1.4,
  kind: null,
  opens: 'outfit',
  parts: [
    // Die Stange und die Manschette, an der die Füße ansetzen.
    { model: POST, size: [0.08, 1.55, 0.08], pose: { at: [0, 0.2, 0] }, stretch: STRETCH },
    { model: POST, size: [0.12, 0.16, 0.12], pose: { at: [0, 0.17, 0] }, stretch: STRETCH },
    ...[0, 1, 2, 3].map(foot),
    ...[0, 1, 2, 3].flatMap(pegs),
    // Hinten am unteren Haken: der Hut der Hexe, halb so groß wie auf dem Kopf.
    {
      model: WITCH,
      node: 'Witch_Hat',
      fit: 0.5615,
      pose: { at: [-0.0924, 1.0526, -0.0254], quat: [-0.5684, 0.0039, -0.0002, 0.8227] },
    },
    // Vorn am unteren Haken: der Umhang des Schwarzen Ritters, 72 cm lang.
    {
      model: BLACK_KNIGHT,
      node: 'BlackKnight_Cape',
      height: 0.72,
      pose: { at: [-0.0055, 0.51, 0.315], quat: [0.0045, 1, 0.0005, -0.0041] },
    },
    // Rechts auf dem oberen Haken: der Helm des Paladins, Öffnung nach unten.
    {
      model: PALADIN,
      node: 'Paladin_Helmet',
      fit: 0.58,
      pose: { at: [0.0143, 1.2465, 0], quat: [0.153, 0.6903, -0.153, 0.6903] },
    },
  ],
};
