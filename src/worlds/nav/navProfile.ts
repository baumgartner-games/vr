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
 * **`Infinity` heißt „niemals" und nicht „sehr teuer".** Die Wegsuche
 * überspringt solche Kacheln ganz, statt sie mit einer großen Zahl doch noch
 * zu betreten, wenn es sonst nicht weitergeht. Wer „lieber nicht, aber im
 * Notfall doch" will, schreibt eine große endliche Zahl hin — der Unterschied
 * ist gewollt und in `navPath.test.ts` festgehalten.
 */

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
};

/** Das Fahrzeug: breit, schwer, und Treppen sind für andere gebaut. */
export const VEHICLE_PROFILE: CostProfile = {
  id: 'vehicle',
  label: 'Fahrzeug',
  hazard: [24, Infinity, Infinity, Infinity, 0, 4, Infinity, Infinity],
  link: { stairs: Infinity, ladder: Infinity, portal: 1, drop: Infinity, jump: Infinity },
  opens: false,
};

/** Der Flieger kennt den Boden nicht — für ihn ist alles gleich weit. */
export const FLYER_PROFILE: CostProfile = {
  id: 'flyer',
  label: 'Flieger',
  hazard: [0, 12, 0, 0, 0, 0, 0, 0],
  link: { stairs: 1, ladder: 1, portal: 1, drop: 1, jump: 1 },
  opens: true,
};

export const COST_PROFILES: readonly CostProfile[] = [
  HUMAN_PROFILE,
  ZOMBIE_PROFILE,
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

/** Ob dieses Profil eine Verbindung dieser Art überhaupt benutzen kann. */
export function canUseLink(profile: CostProfile, kind: LinkKind): boolean {
  return Number.isFinite(profile.link[kind]);
}
