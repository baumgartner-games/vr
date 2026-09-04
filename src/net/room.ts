/**
 * Room codes are typed on a phone and read out loud into a headset, so they are
 * built from short German words instead of random characters.
 */
const WORDS = [
  'apfel',
  'anker',
  'berg',
  'blitz',
  'brise',
  'delta',
  'donner',
  'eiche',
  'falke',
  'feder',
  'flut',
  'funke',
  'garten',
  'gipfel',
  'hafen',
  'halde',
  'insel',
  'iglu',
  'jaguar',
  'kanal',
  'karpfen',
  'kiesel',
  'komet',
  'krone',
  'lampe',
  'lawine',
  'leuchte',
  'linde',
  'mond',
  'moos',
  'nebel',
  'nordlicht',
  'orbit',
  'otter',
  'palme',
  'pfeil',
  'quelle',
  'rabe',
  'regen',
  'riff',
  'salbei',
  'schiefer',
  'segel',
  'stern',
  'tundra',
  'turm',
  'ufer',
  'uhu',
  'vulkan',
  'welle',
  'wolke',
  'zeder',
  'zirkel',
  'zunder',
];

/** e.g. `mond-riff-47` — easy to dictate, still ~1 in 150 000. */
export function randomRoomCode(): string {
  const pick = () => WORDS[Math.floor(Math.random() * WORDS.length)]!;
  const a = pick();
  let b = pick();
  while (b === a) b = pick();
  const number = 10 + Math.floor(Math.random() * 90);
  return `${a}-${b}-${number}`;
}

/**
 * Everything that reaches the signalling network goes through here, so that
 * "Mond Riff 47" and "mond-riff-47" end up in the same room.
 */
export function normalizeRoomCode(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[äöüß]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' })[c] ?? c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/**
 * Der zuletzt benutzte Raum-Code und der eigene Name, im Browser.
 *
 * Beides steht hier und nicht im Panel der Startseite, weil es inzwischen zwei
 * Stellen gibt, an denen man sich verbindet: das Feld auf der Seite und das
 * Menü in der Brille. Zwei Speicher mit demselben Zweck wären zwei Namen, die
 * auseinanderlaufen — und man merkt es erst, wenn der andere im Raum einen
 * fremden Namen liest.
 */
const STORAGE_ROOM = 'bgvr:room';
const STORAGE_NAME = 'bgvr:name';

export function rememberedRoom(): string {
  return readStored(STORAGE_ROOM);
}

export function rememberedName(): string {
  return readStored(STORAGE_NAME);
}

export function rememberRoom(room: string): void {
  writeStored(STORAGE_ROOM, room);
}

export function rememberName(name: string): void {
  writeStored(STORAGE_NAME, name);
}

function readStored(key: string): string {
  try {
    return globalThis.localStorage?.getItem(key) ?? '';
  } catch {
    // Privater Modus, kein Speicher — kein Grund für einen Absturz.
    return '';
  }
}

function writeStored(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    /* siehe oben */
  }
}
