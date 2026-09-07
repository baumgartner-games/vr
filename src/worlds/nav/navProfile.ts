/**
 * **Was etwas kostet, und für wen** — Gefahren, Verbindungsarten und die
 * Kostenprofile, mit denen verschiedene NPC-Sorten dieselbe Karte
 * unterschiedlich lesen.
 *
 * Das ist der Kern des Verhaltens, und er ist absichtlich eine Tabelle und kein
 * Code: eine Karte trägt an jeder Kachel nur, **was dort ist** (Stacheln,
 * Wasser, freies Feld), und was das *bedeutet*, entscheidet erst der, der
 * darüberläuft. Der Zombie hat für Stacheln keinen Eintrag und fällt hinein;
 * der Mensch hat dort `Infinity` und geht außen herum. Dieselbe Kachel,
 * dieselbe Wegsuche, zwei Wege — und wer eine dritte Sorte will, schreibt eine
 * Zeile Tabelle und keine Zeile Logik.
 *
 * **Dasselbe gilt seit Neuestem für die Höhe.** Eine Verbindung trägt nicht
 * mehr die Frage „ist das eine Treppe?", sondern die **Form** des Geländes:
 * wie viel es hinauf- oder hinuntergeht (`rise`), wie hoch die größte einzelne
 * Stufe darin ist (`step`) und wie weit es waagerecht ist (`gap`). Ob man da
 * hochkommt, steht hier — in den **Fähigkeiten** jedes Profils (`stepUp`,
 * `jumpUp`, `maxSlope`, `dropDown`, `leapOver`). Vorher entschied das Abtasten
 * einmal für alle, und dann war eine Rampe entweder für jeden begehbar oder
 * für keinen; ein Zombie, der eine Kante nicht hochkommt, und ein Mensch, der
 * es tut, waren im selben Gitter nicht zu haben.
 *
 * **`Infinity` heißt „niemals" und nicht „sehr teuer".** Die Wegsuche
 * überspringt solche Kacheln ganz, statt sie mit einer großen Zahl doch noch
 * zu betreten, wenn es sonst nicht weitergeht. Wer „lieber nicht, aber im
 * Notfall doch" will, schreibt eine große endliche Zahl hin — der Unterschied
 * ist gewollt und in `navPath.test.ts` festgehalten.
 */

import { survivesFall } from './navFall';
import type { DoorPower, NavLink } from './navGraph';
import { TILE, type TileKey } from './navTile';

// --- Gefahren -------------------------------------------------------------

/**
 * Was auf einer Kachel sein kann, als Bitmaske.
 *
 * Acht Stück, denn mehr passen in ein Byte und mehr braucht bisher niemand.
 * Eine Kachel kann mehrere davon tragen (nasses Gras am Abgrund), und die
 * Kosten addieren sich.
 */
export const HAZARD_NONE = 0;
/** Stacheln, Glasscherben, eine Grube: tut weh, wer hineinläuft. */
export const HAZARD_SPIKES = 1 << 0;
/** Feuer, Säure, Strahlung — dasselbe, nur heißer. */
export const HAZARD_FIRE = 1 << 1;
/** Wasser, Schlamm, tiefer Sand: kostet Zeit, sonst nichts. */
export const HAZARD_WATER = 1 << 2;
/** Eine Kante, hinter der es hinuntergeht. */
export const HAZARD_VOID = 1 << 3;
/** Knirschender Boden: wer hier läuft, wird gehört. */
export const HAZARD_NOISY = 1 << 4;
/** Freies Feld ohne Deckung — wer schießen kann, meidet es. */
export const HAZARD_EXPOSED = 1 << 5;
/** Steil: zu Fuß ja, mit Rädern nein. */
export const HAZARD_STEEP = 1 << 6;
/** Eng: eine Person passt durch, ein Fahrzeug nicht. */
export const HAZARD_NARROW = 1 << 7;

/** Wie viele Gefahren es gibt — die Länge jeder Kostenzeile. */
export const HAZARD_COUNT = 8;

/** Die Namen dazu, für die Debug-Ansicht und den Editor. */
export const HAZARD_NAMES: readonly string[] = [
  'Stacheln',
  'Feuer',
  'Wasser',
  'Abgrund',
  'Laut',
  'Frei einsehbar',
  'Steil',
  'Eng',
];

// --- Verbindungsarten -----------------------------------------------------

/**
 * Wie man von einer Kachel auf eine kommt, die nicht neben ihr liegt.
 *
 * Nachbarkacheln auf derselben Etage brauchen keine Verbindung — die ergeben
 * sich aus dem Gitter. Alles andere ist eine *gebaute* Verbindung mit einer
 * Art, und die Art entscheidet, wer sie benutzen darf: eine Leiter ist für
 * einen Zombie so gut wie eine Wand.
 */
export type LinkKind = 'stairs' | 'ladder' | 'portal' | 'drop' | 'jump';

export const LINK_KINDS: readonly LinkKind[] = ['stairs', 'ladder', 'portal', 'drop', 'jump'];

// --- Profile --------------------------------------------------------------

/** Wie eine NPC-Sorte die Karte liest. */
export interface CostProfile {
  id: string;
  label: string;
  /**
   * Aufschlag je Gefahr, in **Metern**, nach Bit-Index (siehe `HAZARD_NAMES`).
   *
   * Meter, weil auch die Wegkosten Meter sind: „diese Pfütze ist mir acht
   * Meter Umweg wert" ist eine Aussage, die man beim Einstellen im Kopf
   * nachvollziehen kann. Eine dimensionslose Zahl wäre nicht nachvollziehbar,
   * und dann stellt sie niemand mehr richtig ein.
   */
  readonly hazard: readonly number[];
  /** Was eine Verbindungsart kostet, als **Faktor** auf ihre eigenen Kosten. */
  readonly link: Readonly<Record<LinkKind, number>>;
  /**
   * Ob er eine geschlossene Tür aufmachen kann.
   *
   * Die eine Zahl, die aus demselben Haus zwei verschiedene Karten macht: für
   * den, der Klinken bedienen kann, ist eine geschlossene Tür ein Umweg von
   * drei Metern, für den anderen eine Wand.
   */
  readonly opens: boolean;
  /**
   * Ob er eine Tür **einschlägt**, die er nicht aufbekommt.
   *
   * Die zweite Hälfte derselben Frage, und sie gehört dem Zombie: Er hat keine
   * Hände für eine Klinke, aber Fäuste für ein Brett. Was dabei
   * herauskommt, entscheidet das Material der Tür (`navDoor.ts`) — Holz gibt
   * nach, Metall nicht. Ohne diese Zeile stand ein Zombie vor jeder
   * Holzhütte, als wäre sie ein Tresor.
   *
   * Der Mensch hat sie **nicht**: Wer aufmachen kann, macht auf, und wer vor
   * einer verriegelten Tür steht, sucht einen anderen Weg statt sie zu
   * zertrümmern. Das ist eine Entscheidung über das Spiel und keine über die
   * Physik — Türen eintretende Menschen wären eine eigene Sorte.
   */
  readonly breaks: boolean;

  // --- was er mit einem Höhenunterschied anfangen kann ---------------------

  /**
   * **Wie hoch er tritt**, ohne dafür etwas zu tun, in Metern.
   *
   * Die Bordsteinkante: Was darunter liegt, ist für ihn eben. Beim Anstieg
   * einer Rampe ist es die Höhe der einzelnen Stufe — wer 12-cm-Stufen
   * hinaufgeht, geht; wer für jede hüpfen müsste, geht nicht.
   *
   * **Kleiner als das Abtasten aufloest, geht es nicht** (`navBake.ts`,
   * `BAKE_DEFAULTS.step`): Was dort als eben durchgeht, steht in der Karte gar
   * nicht mehr, und ein Profil mit einer kleineren Zahl bekäme eine Karte, die
   * ihm mehr verspricht, als sie hält.
   */
  readonly stepUp: number;

  /**
   * **Wie hoch er sich hinaufbringt**, wenn er dafür springt, in Metern.
   *
   * Der Unterschied zu `stepUp` ist der zwischen Gehen und Klettern: Eine
   * 80-cm-Stufe tritt niemand, ein Zombie zieht sich hinauf, ein Fahrzeug
   * nicht. Was die Welt daraus macht, ist ein kurzer Wurf (`Npc.launch`) —
   * deshalb ist die Zahl auch nicht beliebig groß: Ein NPC, der drei Meter
   * hochspringt, sieht aus wie ein Fehler und nicht wie ein Gegner.
   *
   * Nie kleiner als `stepUp`; wer nicht springt, schreibt hier dieselbe Zahl
   * hin.
   */
  readonly jumpUp: number;

  /**
   * **Wie steil ein Weg noch sein darf**, in Grad.
   *
   * Gemessen wird über eine **Kachel** (2,5 m waagerecht, `navTile.ts`), denn
   * feiner löst diese Karte nicht auf: Was zwischen zwei Kachelmitten an
   * Höhe liegt, ist die Steigung dieses Stücks, egal wie die Rampe darunter
   * gebaut ist. Eine Zahl von 20° heißt hier also „einen halben Meter je
   * Kachel" — das ist weniger, als ein Mensch klettern kann, und genau so viel,
   * wie ein Mensch **läuft**.
   *
   * Sie gilt nur für Gelände, über das der Boden durchläuft. Eine einzelne
   * Kante ist keine Steigung, sondern eine Stufe (`stepUp`, `jumpUp`) — sonst
   * wäre jede Bordsteinkante eine 8°-Rampe und jede Mauer eine 45°-.
   */
  readonly maxSlope: number;

  /**
   * **Wie tief er freiwillig hinunterspringt**, in Metern.
   *
   * Der Wille, nicht das Können: Was er überlebt, rechnet der Fallschaden aus
   * (`navFall.ts`, `health`), und **beides** muss stimmen. Ein Zombie springt,
   * was er aushält; ein Mensch bleibt darunter, weil er nicht mit einem
   * gebrochenen Bein ankommen will.
   */
  readonly dropDown: number;

  /**
   * **Wie weit er über eine Lücke setzt**, in Metern, von Kachelmitte zu
   * Kachelmitte.
   *
   * Fünf Meter klingen viel und sind eine Kachel Lücke mit je einer halben
   * Kachel Anlauf und Landung — genau der Gang zwischen den beiden Podesten im
   * Labor. Wer gar nicht springt, schreibt `0` hin und braucht dann auch
   * keinen `link.jump`.
   */
  readonly leapOver: number;

  /**
   * **Was seine Sorte aushält** — nur für den Fallschaden.
   *
   * Die Karte kennt keinen einzelnen NPC, sondern eine Sorte: Was hier steht,
   * ist das Leben, mit dem einer aus dem Menü kommt (`npc/npcKinds.ts`). Wer
   * seinen Hamster im Hirn-Werkzeug auf 500 Leben stellt, ändert damit, was er
   * *aushält*, aber nicht, was er sich *traut* — und das ist die ehrlichere von
   * zwei unangenehmen Antworten: Die andere wäre eine Wegsuche, die für jeden
   * NPC eine eigene Karte liest.
   */
  readonly health: number;
}

/**
 * Der Mensch: er weiß, was ihm wehtut, und geht darum herum.
 *
 * Deckung ist ihm zwölf Meter Umweg wert — das ist die Zahl, die aus einem Bot
 * mit Wegsuche einen Bot macht, der sich an Wänden entlangbewegt statt über
 * den Platz zu spazieren.
 */
export const HUMAN_PROFILE: CostProfile = {
  id: 'human',
  label: 'Mensch',
  hazard: [Infinity, Infinity, 8, Infinity, 6, 12, 2, 0],
  link: { stairs: 1, ladder: 1.4, portal: 1, drop: 2, jump: 1.6 },
  opens: true,
  breaks: false,
  stepUp: 0.4,
  // Eine Brüstung, an der man sich hochzieht — und die Zahl, an der im Labor
  // die vier Stufen der flachen Steigung hängen (60 cm).
  jumpUp: 1.2,
  maxSlope: 20,
  dropDown: 4,
  leapOver: 5,
  health: 120,
};

/**
 * Der Zombie: er sieht keine Gefahr, weil er keine kennt.
 *
 * Die Tabelle ist leer, und das ist kein Sparen an Zahlen, sondern das ganze
 * Verhalten: er läuft in die Stachelgrube, er läuft von der Kante, und er
 * läuft über den offenen Platz. Was ihn aufhält, sind Wände. Leitern und
 * Sprünge kann er nicht — dafür bräuchte er Hände und einen Plan.
 */
export const ZOMBIE_PROFILE: CostProfile = {
  id: 'zombie',
  label: 'Zombie',
  hazard: [0, 0, 4, 0, 0, 0, 0, 0],
  link: { stairs: 1, ladder: Infinity, portal: 1, drop: 1, jump: Infinity },
  opens: false,
  breaks: true,
  stepUp: 0.4,
  // Er zieht sich an einer Stufe hoch, er setzt aber über nichts hinweg: Ein
  // Sprung über eine Lücke braucht einen Plan, eine Stufe nur Arme.
  jumpUp: 1,
  maxSlope: 18,
  // Er springt, was er aushält — vier Meter (`navFall.safeFall`, 100 Leben).
  // Die Zahl steht trotzdem hier: Ein Zombie mit doppeltem Leben soll deshalb
  // nicht von jedem Hochhaus springen.
  dropDown: 4,
  leapOver: 0,
  health: 100,
};

/**
 * **Der Hamster** — die Sorte, die vor einer Kante stehen bleibt, weil sie den
 * Aufprall nicht überlebt.
 *
 * Klein, flink und mit zwanzig Leben: `navFall.safeFall` macht daraus zwei
 * Meter, und damit ist ein Dach von 2,4 m für ihn kein Weg nach unten mehr,
 * sondern das Ende. Er ist die dritte Antwort auf dieselbe Kante, und genau
 * dafür gibt es ihn: Der Zombie springt, weil er sie aushält; der Mensch geht
 * die Treppe, weil er sie *nicht mag*; der Hamster bleibt oben, weil er sie
 * nicht überlebt.
 */
export const CRITTER_PROFILE: CostProfile = {
  id: 'critter',
  label: 'Kleintier',
  hazard: [Infinity, Infinity, Infinity, Infinity, 2, 4, 0, 0],
  link: { stairs: 1, ladder: Infinity, portal: 1, drop: 1, jump: Infinity },
  opens: false,
  breaks: false,
  // Kleiner geht nicht: `BAKE_DEFAULTS.step` ist die feinste Stufe, die
  // überhaupt in der Karte steht.
  stepUp: 0.32,
  jumpUp: 0.32,
  // **Vier Beine kommen eine Böschung hinauf, die ein Mensch umgeht** — und
  // das ist die Gegenprobe zur steilen Steigung im Labor: Dieselbe Rampe, vor
  // der Zombie und Puppe stehen bleiben, läuft er hinauf. Nicht die Bucht
  // entscheidet das, sondern diese Zahl.
  maxSlope: 32,
  dropDown: 3,
  leapOver: 0,
  health: 20,
};

/** Das Fahrzeug: breit, schwer, und Treppen sind für andere gebaut. */
export const VEHICLE_PROFILE: CostProfile = {
  id: 'vehicle',
  label: 'Fahrzeug',
  hazard: [24, Infinity, Infinity, Infinity, 0, 4, Infinity, Infinity],
  link: { stairs: Infinity, ladder: Infinity, portal: 1, drop: Infinity, jump: Infinity },
  opens: false,
  // Eine Holztür ist für zwei Tonnen Blech kein Hindernis, sondern ein
  // Geräusch.
  breaks: true,
  stepUp: 0.32,
  jumpUp: 0.32,
  maxSlope: 10,
  dropDown: 0.5,
  leapOver: 0,
  health: 400,
};

/** Der Flieger kennt den Boden nicht — für ihn ist alles gleich weit. */
export const FLYER_PROFILE: CostProfile = {
  id: 'flyer',
  label: 'Flieger',
  hazard: [0, 12, 0, 0, 0, 0, 0, 0],
  link: { stairs: 1, ladder: 1, portal: 1, drop: 1, jump: 1 },
  opens: true,
  breaks: false,
  // Für den, der fliegt, ist jede Kante keine: Steigung, Stufe und Absprung
  // sind dasselbe Nichts.
  stepUp: Infinity,
  jumpUp: Infinity,
  maxSlope: 90,
  dropDown: Infinity,
  leapOver: Infinity,
  health: 60,
};

export const COST_PROFILES: readonly CostProfile[] = [
  HUMAN_PROFILE,
  ZOMBIE_PROFILE,
  CRITTER_PROFILE,
  VEHICLE_PROFILE,
  FLYER_PROFILE,
];

export function profileOf(id: string | undefined): CostProfile {
  return COST_PROFILES.find((profile) => profile.id === id) ?? HUMAN_PROFILE;
}

/**
 * Was die Gefahren einer Kachel diesem Profil kosten, in Metern.
 *
 * `Infinity`, sobald **eine** davon unpassierbar ist — und dann wird gar nicht
 * erst weiteraddiert, denn `Infinity + 8` ist zwar richtig, aber die Schleife
 * darf hier aufhören.
 */
export function hazardCost(profile: CostProfile, mask: number): number {
  if (mask === HAZARD_NONE) return 0;
  let sum = 0;
  for (let bit = 0; bit < HAZARD_COUNT; bit++) {
    if ((mask & (1 << bit)) === 0) continue;
    const cost = profile.hazard[bit] ?? 0;
    if (!Number.isFinite(cost)) return Infinity;
    sum += cost;
  }
  return sum;
}

/**
 * Was dieses Profil an einer Tür kann (`navGraph.wallState`).
 *
 * Die eine Stelle, an der aus zwei Zeilen Tabelle die Frage wird, die die
 * Wegsuche stellt — damit niemand irgendwo `{ opens: p.opens, breaks: false }`
 * hinschreibt und sich wundert, warum der Zombie vor der Bretterbude steht.
 */
export function powerOf(profile: CostProfile): DoorPower {
  return { opens: profile.opens, breaks: profile.breaks };
}

/** Ob dieses Profil eine Verbindung dieser Art überhaupt benutzen kann. */
export function canUseLink(profile: CostProfile, kind: LinkKind): boolean {
  return Number.isFinite(profile.link[kind]);
}

// --- die Form des Geländes ------------------------------------------------

/**
 * **Wie ein Stück Weg aussieht** — drei Zahlen, aus denen jedes Profil seine
 * eigene Antwort zieht.
 *
 * Sie stehen an der Verbindung (`navGraph.NavLink`) und werden beim Abtasten
 * gemessen (`navBake.ts`), nicht beurteilt: Das Abtasten sagt „hier geht es
 * 2,4 m hinauf, in einer einzigen Kante", und ob das eine Stufe, eine Wand
 * oder ein Klacks ist, entscheidet erst der, der davorsteht.
 */
export interface EdgeShape {
  /** Höhenunterschied in Laufrichtung, in Metern — positiv heißt hinauf. */
  rise: number;
  /**
   * Die **größte einzelne Stufe** darin, in Metern.
   *
   * Der Unterschied zwischen einer Rampe und einer Mauer, und er ist mit
   * einer Zahl allein nicht zu haben: Zwei Kacheln, zwischen denen es 2,4 m
   * hinaufgeht, können eine Rampe aus zwanzig Stufen sein oder eine glatte
   * Wand. `rise` ist bei beiden gleich, `step` ist es nie.
   */
  step: number;
  /** Wie weit es waagerecht ist, in Metern — für Sprünge über eine Lücke. */
  gap: number;
}

/** Wie steil ein Stück Weg ist, in Grad — `run` ist die waagerechte Strecke. */
export function slopeDegrees(rise: number, run: number = TILE): number {
  if (!(run > 0)) return 90;
  return (Math.atan(Math.abs(rise) / run) * 180) / Math.PI;
}

/**
 * Die Form einer Verbindung, **von dieser Seite aus gesehen**.
 *
 * Eine Verbindung wird einmal eingetragen und von beiden Enden benutzt; wer
 * sie rückwärts läuft, geht hinunter, wo der Eintrag hinaufgeht. Ohne diese
 * Zeile wäre jede Kante eine Einbahnstraße — oder, schlimmer, in beide
 * Richtungen dieselbe Steigung, und die Zombies liefen Klippen hoch.
 */
export function shapeOf(link: NavLink, towards: TileKey): EdgeShape {
  const rise = link.rise ?? 0;
  return {
    rise: towards === link.to ? rise : -rise,
    step: link.step ?? Math.abs(rise),
    gap: link.gap ?? 0,
  };
}

/** Zwei Höhen gelten als gleich, wenn sie es auf den Zentimeter sind. */
const EVEN = 0.02;

/**
 * **Ob dieses Profil hier durchkommt.**
 *
 * Die eine Stelle, an der aus sechs Zahlen im Profil und drei am Gelände ein Ja
 * oder ein Nein wird — und sie steht hier und nicht in der Wegsuche, weil
 * dieselbe Form auch der Läufer liest (`navAgent.leaps`, `shapeOf`) und zwei
 * Exemplare derselben Rechnung irgendwann verschieden antworten.
 *
 * Unterschieden werden **Stufe und Steigung**, und das ist der ganze Kern:
 *
 * - Steckt die ganze Höhe in **einer** Kante (`step ≈ rise`), ist es eine
 *   Stufe. Dann zählt, wie hoch einer tritt und sich hinaufzieht — der Winkel
 *   nicht: Eine 40-cm-Bordsteinkante ist keine 9°-Rampe, sondern eine
 *   Bordsteinkante.
 * - Läuft der Boden durch (viele kleine Stufen, eine Rampe), zählt der
 *   **Winkel** — und nebenbei, dass die einzelnen Stufen darin klein genug
 *   sind, um sie zu gehen. Wer eine Rampe hochhüpfen müsste, geht sie nicht.
 *
 * Nach unten kommt zum Wollen (`dropDown`) noch das Können: Was mehr abzieht,
 * als er Leben hat, springt niemand (`navFall.ts`). Das ist die Zeile, wegen
 * der ein Hamster auf dem Dach stehen bleibt, von dem ein Zombie springt.
 */
export function canTraverse(profile: CostProfile, kind: LinkKind, shape: EdgeShape): boolean {
  if (!canUseLink(profile, kind)) return false;
  // Ein Portal versetzt und eine Leiter hat Sprossen: Beide fragen nicht nach
  // Steigung, sondern nur danach, ob dieses Profil sie überhaupt benutzt.
  if (kind === 'portal' || kind === 'ladder') return true;

  const { rise, step, gap } = shape;
  // **Ein Sprung über eine Lücke** ist weder Stufe noch Steigung: Dazwischen
  // ist gar nichts, und was zählt, sind die Weite und die Höhe, die er dabei
  // gewinnt oder verliert.
  if (kind === 'jump') {
    if (gap > profile.leapOver + EVEN) return false;
    return rise >= 0 ? rise <= profile.jumpUp + EVEN : survivesDrop(profile, -rise);
  }

  // Eine einzelne Kante: Die ganze Höhe steckt in einer Stufe, und dann ist der
  // Winkel keine Auskunft mehr.
  const ledge = step >= Math.abs(rise) - EVEN;
  if (ledge) {
    if (rise >= 0) return rise <= profile.jumpUp + EVEN;
    return survivesDrop(profile, -rise);
  }

  // Sonst läuft der Boden durch: eine Rampe, hinauf wie hinunter dieselbe.
  if (step > profile.stepUp + EVEN) return false;
  return slopeDegrees(rise) <= profile.maxSlope + EVEN;
}

/** Eine Kante hinunter: erst der Wille (`dropDown`), dann der Knochenbau. */
function survivesDrop(profile: CostProfile, fall: number): boolean {
  if (fall <= profile.stepUp + EVEN) return true;
  if (fall > profile.dropDown + EVEN) return false;
  return survivesFall(profile.health, fall);
}

/**
 * **Was eine Verbindung diesem Profil kostet**, als Faktor — `Infinity` heißt
 * „nicht mit mir".
 *
 * Die Wegsuche fragt nur noch das (`navPath.ts`): Faktor mal Länge, und
 * `Infinity` fällt von selbst heraus. `towards` ist die Kachel, auf die er
 * dabei zusteuert — eine Kante hinauf ist etwas anderes als dieselbe Kante
 * hinunter.
 */
export function linkFactor(profile: CostProfile, link: NavLink, towards: TileKey): number {
  const factor = profile.link[link.kind];
  if (!Number.isFinite(factor)) return Infinity;
  return canTraverse(profile, link.kind, shapeOf(link, towards)) ? factor : Infinity;
}
