/**
 * Room codes are typed on a phone and read out loud into a headset, so they are
 * built from short German words instead of random characters.
 */
const WORDS = [
  'apfel', 'anker', 'berg', 'blitz', 'brise', 'delta', 'donner', 'eiche',
  'falke', 'feder', 'flut', 'funke', 'garten', 'gipfel', 'hafen', 'halde',
  'insel', 'iglu', 'jaguar', 'kanal', 'karpfen', 'kiesel', 'komet', 'krone',
  'lampe', 'lawine', 'leuchte', 'linde', 'mond', 'moos', 'nebel', 'nordlicht',
  'orbit', 'otter', 'palme', 'pfeil', 'quelle', 'rabe', 'regen', 'riff',
  'salbei', 'schiefer', 'segel', 'stern', 'tundra', 'turm', 'ufer', 'uhu',
  'vulkan', 'welle', 'wolke', 'zeder', 'zirkel', 'zunder',
];

/** e.g. `mond-riff-47` — easy to dictate, still ~1 in 150 000. */
export function randomRoomCode(): string {
  const pick = () => WORDS[Math.floor(Math.random() * WORDS.length)]!;
  let a = pick();
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
