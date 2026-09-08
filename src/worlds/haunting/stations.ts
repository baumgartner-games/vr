import { pickHost, type HostCandidate } from '../../net/host';

/**
 * **Der Van: mehr Stationen als Spieler.**
 *
 * Das ist keine Sparmaßnahme, sondern die Spannungsquelle des ganzen
 * Web-Teils. Es gibt vier Geräte und meistens zwei oder drei Leute davor; die
 * eigentliche Entscheidung des Abends ist deshalb nie „was tue ich", sondern
 * **„was lassen wir gerade unbeobachtet"**. Eine unbesetzte Station läuft
 * weiter — das Monster wandert weiter über den Späherschirm, nur sieht
 * niemand hin.
 *
 * **Wem ein Gerät gehört, entscheidet die Sitzdauer** — dieselbe Regel, mit
 * der die Welt ihren Gastgeber wählt (`net/host.ts`), und aus demselben Grund:
 * Sie kommt ohne Absprache und ohne Server aus, weil jeder seine eigene Dauer
 * kennt und ansagt, und Dauern wachsen auf allen Uhren gleich schnell. Wer
 * sich auf ein besetztes Gerät setzt, wird **weggeschubst** — er verliert
 * Zeit, aber nichts, was er schon weiß.
 *
 * **Ein Wechsel dauert, und man sieht ihn kommen.** Ohne die Laufzeit wäre der
 * Griff nach demselben Gerät ein Rennen, das der mit dem schnelleren Handy
 * gewinnt — unsichtbar und ärgerlich. Mit ihr wird daraus eine Verhandlung:
 * Zwei sehen sich auf dasselbe Terminal zulaufen, und einer ruft „geh du, ich
 * nehm den Hacker". Genau dieses Zurufen ist das Spiel.
 */
export type StationId = 'archive' | 'scout' | 'drone' | 'hack';

export interface StationFacts {
  id: StationId;
  label: string;
  /** Eine Zeile, die sagt, was man hier tut. */
  tagline: string;
  /** Was diese Station sieht — und was ausdrücklich nicht. */
  sees: string;
  /** Ob dafür die Welt gezeichnet werden muss (der Hacker sieht kein Bild). */
  view: boolean;
}

export const STATIONS: readonly StationFacts[] = [
  {
    id: 'archive',
    label: 'Archiv',
    tagline: 'Grundriss, Zimmer für Zimmer',
    sees: 'Räume und was darin steht — aber niemanden, der sich bewegt',
    view: true,
  },
  {
    id: 'scout',
    label: 'Späher',
    tagline: 'Wo es gerade ist',
    sees: 'nur Wände und einen Punkt: keine Namen, keine Möbel, kein Mitspieler',
    view: true,
  },
  {
    id: 'drone',
    label: 'Drohne',
    tagline: 'Ein Zimmer, jetzt, vollständig',
    sees: 'alles im Zimmer, in dem sie steht — sonst nichts',
    view: true,
  },
  {
    id: 'hack',
    label: 'Schalttafel',
    tagline: 'Licht, Türen, Radios',
    sees: 'Schalter mit schlechten Beschriftungen — und keinen Grundriss',
    view: false,
  },
];

export function stationFacts(id: StationId): StationFacts {
  return STATIONS.find((one) => one.id === id) ?? STATIONS[0]!;
}

export function isStation(value: unknown): value is StationId {
  return STATIONS.some((one) => one.id === value);
}

/** Wie lange man von einem Gerät zum nächsten braucht, in Sekunden. */
export const MOVE_TIME = 2.5;
/** Und wie lange man am Boden liegt, wenn jemand schneller war. */
export const SHOVE_TIME = 5;

/** Was ein Spieler über seinen Platz ansagt. */
export interface Claim extends HostCandidate {
  station: StationId;
}

/**
 * Wem dieses Gerät gehört: wer am längsten davorsitzt.
 *
 * @returns die Peer-Id, oder `''`, wenn niemand daran sitzt.
 */
export function ownerOf(claims: readonly Claim[], station: StationId): string {
  return pickHost(claims.filter((claim) => claim.station === station));
}

/** Woran dieser Spieler wirklich sitzt — `null`, wenn er weggeschubst wurde. */
export function seatOf(claims: readonly Claim[], peer: string): StationId | null {
  const mine = claims.find((claim) => claim.id === peer);
  if (!mine) return null;
  return ownerOf(claims, mine.station) === peer ? mine.station : null;
}

/**
 * Ob dieser Spieler gerade nach einem Platz greift, der einem anderen gehört.
 *
 * Getrennt von `seatOf`, weil beides gleich aussieht und Verschiedenes
 * bedeutet: „nirgends angemeldet" ist der Anfang einer Runde, „angemeldet und
 * verloren" ist der Schubser. Nur das zweite kostet Zeit.
 */
export function shoved(claims: readonly Claim[], peer: string): boolean {
  const mine = claims.find((claim) => claim.id === peer);
  if (!mine) return false;
  return ownerOf(claims, mine.station) !== peer;
}

/** Wer wo sitzt — für die Kachelübersicht im Van. */
export function seating(claims: readonly Claim[]): Map<StationId, string> {
  const out = new Map<StationId, string>();
  for (const station of STATIONS) {
    const owner = ownerOf(claims, station.id);
    if (owner) out.set(station.id, owner);
  }
  return out;
}
